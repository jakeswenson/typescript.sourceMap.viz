module SourceMapVisualizer {

    export function decodeFully(value: string): number[]{
        var result: number[] = [];
        while (value && value !== "") {
            var decoded = TypeScript.Base64VLQFormat.decode(value);
            result.push(decoded.value);
            value = decoded.rest;
        }
        return result;
    }

    export interface RawSegment {
        id: number;
        segment: string;
        decoded: number[];
    }

    export interface Segment {
        id: number;
        lineNumber: number;
        segmentNumber: number;
        offset: number;
        length: number;
        sourceLine?: number;
        sourceOffset?: number;
        isRaw?: boolean;
    }

    export interface SourceSegment {
        id: number;
        line: number;
        column: number;
    }

    export interface TextFile {
        name: string;
        type: string;
        content: string;
        lineMap?: string[];
    }

    export interface SourceInfo {
        [file: string]: TextFile;
        emittedSource?: TextFile;
        source?: TextFile;
        sourceMap?: TextFile;
    }

    interface SourceSpan extends SourceSegment {
        length?: number;
    }

    export var Segments: Segment[] = null;
    export var sources: SourceInfo = {};

    module Display {
        export var colors = //d3.scale.category10();
            d3.scale.ordinal().range(['#aec7e8', '#ff7f0e', '#ff9896', '#f7b6d2', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5']);


        export function createMappingSpan(segment: RawSegment) {
            return $('<span>')
                .attr('id', 'map' + segment.id)
                .attr('title', JSON.stringify(segment.decoded))
                .text(segment.segment)
                .click(() => {
                    $(document).triggerHandler('segment.click', segment.id);
                }).tooltip({ trigger: 'hover focus click' });
        }

        export function createSourceSpan(segment: SourceSpan, text: string) {
            var color = colors(segment.id).toString();
            var span = $('<span>')
                .text(text)
                .attr('title', JSON.stringify({ line: segment.line, col: segment.column, len: segment.length }))
                .attr('id', 'source' + segment.id)
                .addClass('emitSpan')
                .css('background-color', color)
                .hover(() => {
                    $(document).triggerHandler('segment.hoverStart', segment.id);
                }, () => {
                    $(document).triggerHandler('segment.hoverEnd', segment.id);
                }).tooltip({ trigger: 'hover focus click' });

            return span;
        }

        export function createSpan(segment: Segment, text: string) {
            var span = $('<span>');
            span.text(text);

            if (!segment.isRaw) {
                var color = colors(segment.id).toString();
                span.attr('id', 'emit' + segment.id)
                    .addClass('emitSpan')
                    .css('background-color', color)
                    .hover(() => {
                        $(document).triggerHandler('segment.hoverStart', segment.id);
                    }, () => {
                        $(document).triggerHandler('segment.hoverEnd', segment.id);
                    });
            }

            return span;
        }

        export function simpleSpan(text) {
            return $('<span>').text(text);
        }
    }

    export module DragDrop {
        function handleBundleDrop(mapFile: File, otherFiles: File[]) {
            var mapReader = new FileReader();
            mapReader.onload = evt => {
                var mapContents = mapReader.result;
                $('#sourceMap').text(mapReader.result);
                $('#emitted').removeClass('hidden');

                sources.sourceMap = { name: mapFile.name, type: mapFile.type, content: mapContents };
                var mapData = JSON.parse(mapContents);

                var emittedSourceFile = _.find(otherFiles, file => file.name === mapData.file);
                if (!emittedSourceFile) {
                    return;
                }

                var sourceFiles = _.reject(otherFiles, file => file.name === mapData.file);
                var emittedSourceFileReader = new FileReader();
                emittedSourceFileReader.onload = () => {
                    sources.emittedSource = {
                        name: emittedSourceFile.name,
                        type: emittedSourceFile.type,
                        content: emittedSourceFileReader.result
                    };

                    $('#emittedSourceRaw').text(emittedSourceFileReader.result);
                    $('#sourceCode').removeClass('hidden');

                    _.forEach(sourceFiles, source => {
                        var reader = new FileReader();
                        // TODO: assumes only one for now
                        reader.onload = () => {
                            sources.source = { name: source.name, type: source.type, content: reader.result };
                            $('#sourceRaw').text(reader.result);
                            refreshSources(Segments);
                        };
                        reader.readAsText(source);
                    });

                    refresh();
                };

                emittedSourceFileReader.readAsText(emittedSourceFile);
                refresh();
            };
            mapReader.readAsText(mapFile);
        }

        export function handleDrop(e: JQueryEventObject) {
            e.stopPropagation();
            e.preventDefault();

            var files: FileList = (<any>e.originalEvent).dataTransfer.files;

            var mapFile = _.find(files, (file: File) => /\.map$/.test(file.name));
            var otherFiles = _.reject(files, (file: File) => /\.map$/.test(file.name));

            if (mapFile && files.length > 1) {
                handleBundleDrop(mapFile, otherFiles);
            }
            else {
                for (var i = 0, len = files.length; i < len; i++) {
                    var file: File = files[i];
                    var fr = new FileReader();
                    fr.onload = () => {
                        sources[$(this).data('target')] = { name: file.name, type: file.type, content: fr.result };
                        $('#' + $(this).data('target')).text(fr.result);
                        $('#' + $(this).data('next')).removeClass('hidden');
                        refresh();
                    };
                    fr.readAsText(file);
                }
            }
        }

        export function setup(dropbox: JQuery) {
            function none(evt) {
                evt.stopPropagation();
                evt.preventDefault();
            }
            dropbox.on("dragenter", none);
            dropbox.on("dragexit", none);
            dropbox.on("dragover", none);
            dropbox.on('drop', SourceMapVisualizer.DragDrop.handleDrop);
        }
    }

    export var sourceMapData: { mappings: string; lineMap: string[]; segments: RawSegment[][]; map: any };

    function refreshSourceMapData() {
        var sourceMap = sources.sourceMap;
        if (sourceMap && sourceMap.content) {
            var map = JSON.parse(sourceMap.content)
            var lineMap: string[] = map.mappings.split(';');
            var id = 0;
            var segments: RawSegment[][]  = _.map(lineMap,
                line => line.split(',').map(
                    seg => {
                        return {
                            id: id++,
                            segment: seg,
                            decoded: decodeFully(seg)
                        }
                    }));

            sourceMapData = {
                map: map,
                mappings: map.mappings,
                lineMap: lineMap,
                segments: segments
            };

            var content = JSON.stringify(map);
            var mappingsStr = '"mappings":"';

            var idx = content.indexOf(mappingsStr) + mappingsStr.length;

            function span(text) {
                return $('<span>').text(text);
            }

            var spans = [ span(content.substr(0, idx)) ];
            var length = 0;

            _.forEach(sourceMapData.segments, (lineSeg, l) => {
                if (l > 0) { spans.push(span(';')); length++; }
                _.forEach(lineSeg, (seg, s) => {
                    if (s > 0) {
                        spans.push(span(','));
                        length++;
                    }
                    spans.push(Display.createMappingSpan(seg));
                    length += seg.segment.length;
                });
            });

            spans.push(span(content.substr(idx + length)));

            var sm = $('#sourceMap');
            sm.html('');
            sm.append(spans);
        }
    }

    function collectSegments(emittedSource:TextFile): Segment[] {
        var segments: Segment[] = [];
        var adjustment = 0;
        var lineOffset = 0;
        var content = emittedSource.content;

        _.forEach(sourceMapData.segments, (lineSegments, lineNumber) => {
            var lastLineOffset = 0;
            var eol = emittedSource.lineMap[lineNumber].length + 1;
            //console.log('Line', lineNumber, 'length', eol);

            _.forEach(lineSegments, (segment, segmentNumber) => {

                var data = segment.decoded;

                if (data.length < 1) {
                    return;
                }

                if (segmentNumber === 0 && data[0] !== 0) {
                    segments.push({
                        id: segment.id,
                        lineNumber: lineNumber,
                        segmentNumber: segmentNumber,
                        isRaw: true,
                        offset: lineOffset,
                        length: data[0]
                    });
                }

                // console.log('SEGMENT', segment, '-> line', lineNumber, 'segment', segmentNumber, 'data', data);

                var nextSegment = sourceMapData.segments[lineNumber][segmentNumber + 1];
                var nextOffset = nextSegment ? nextSegment.decoded[0] : null;
                var segmentOffset = lineOffset + lastLineOffset + data[0];
                var length = !nextOffset ? eol - (data[0] + lastLineOffset) : nextOffset;

                var source = content.substr(segmentOffset, length);
                //console.log(lineNumber, segmentNumber, segmentOffset, length , JSON.stringify(source));

                segments.push({
                    id: segment.id,
                    lineNumber: lineNumber,
                    segmentNumber: segmentNumber,
                    offset: segmentOffset,
                    length: length,
                    sourceLine: data[2],
                    sourceOffset: data[3]
                });

                lastLineOffset += data[0];
            });

            lineOffset += eol;
        });

        return segments;
    }

    function refreshEmittedSource() {
        var emittedSource = sources.emittedSource;
        if (emittedSource && emittedSource.content) {
            emittedSource.lineMap = emittedSource.content.split('\n');

            var segments = collectSegments(emittedSource);
            Segments = segments;

            var emittedSourceEl = $('#emittedSource');
            emittedSourceEl.html('');

            var offset = 0;
            segments.forEach(segment => {

                if (offset !== segment.offset) {
                    var length = segment.offset - offset;
                    //var coveringSpan = createSpan({
                    //    id: segment.id,
                    //    lineNumber: segment.lineNumber,
                    //    segmentNumber: segment.segmentNumber,
                    //    isRaw: true,
                    //    offset: offset,
                    //    length: length
                    //}, emittedSource.content.substr(offset, length));
                    offset += length;

                    //emittedSourceEl.append(coveringSpan);
                }

                var span = Display.createSpan(segment, emittedSource.content.substr(segment.offset, segment.length));
                emittedSourceEl.append(span);
                offset += segment.length;
            });

        }
    }

    function refreshSources(segments: Segment[]) {
        var sourceFile = sources.source;
        sourceFile.lineMap = sourceFile.content.split('\n');

        var line = 0;
        var col = 0;
        var sourceSegs = _.filter(segments, seg => !seg.isRaw).map(seg => {
            var s: SourceSegment = {
                column: seg.sourceOffset || 0,
                line: seg.sourceLine || 0,
                id: seg.id
            };
            return s;
        });

        var ss: SourceSpan[] = [];

        sourceSegs.reduce((prev: SourceSpan, cur) => {
            var line = prev.line + cur.line;
            var col = prev.column + cur.column;
            var item: SourceSpan = { id: cur.id, line: line, column: col };
            ss.push(item);
            if (prev.line === line) {
                prev.length = cur.column;
            }
            return item;
        }, <SourceSpan>{ id: 0, line: 0, column: 0 });

        //console.log('done', ss.length);
        ss.forEach(span => console.log('id', span.id, 'line', span.line, 'col', span.column, 'len', span.length));

        var spans = [];
        var lastLine = 0;
        ss.sort((a, b) => a.line - b.line || a.column - b.column)
            .forEach(span => {
                var line = span.line;
                //console.log('line', line, 'col', span.column);
                var isNewLine = line !== lastLine;
                var multiLine = (line - lastLine) >= 2;
                lastLine = line;
                var hasLeader = span.column !== 0;

                if (multiLine) {
                    _.range(lastLine + 1, line).forEach(line => {
                        spans.push(Display.simpleSpan(sourceFile.lineMap[line] + '\n'));
                    });
                }

                if (isNewLine && hasLeader) {
                    spans.push(Display.simpleSpan(sourceFile.lineMap[line].substr(0, span.column)));
                }

                if (span.length === undefined) {
                    spans.push(Display.createSourceSpan(span, sourceFile.lineMap[line].substr(span.column) + '\n'));
                }
                else {
                    spans.push(Display.createSourceSpan(span, sourceFile.lineMap[line].substr(span.column, span.length)));
                }
            });

        $('#source').html('');
        $('#source').append(spans);
    }

    export function refresh() {
        refreshSourceMapData();
        refreshEmittedSource();
    }

    export function init() {

        $(document).on('segment.click', (evt, id) => {
            console.log('clicked', id);

            var map = $('#map' + id);
            var emit = $('#emit' + id);

            map.toggleClass('emitSpan emitSpanHover').css('background-color', (i, value) => {
                return Display.colors(id).toString();
            });
            emit.toggleClass('emitSpanHover');

        }).on('segment.hoverStart', (evt, id) => {
            $('#map' + id).addClass('emitSpan emitSpanHover').css('background-color', Display.colors(id).toString()).tooltip('show');
            $('#emit' + id).addClass('emitSpanHover');
            $('#source' + id).addClass('emitSpanHover').tooltip('show');
        }).on('segment.hoverEnd', (evt, id) => {
            $('#map' + id).removeClass('emitSpan emitSpanHover').css('background-color', '').tooltip('hide');
            $('#source' + id).removeClass('emitSpanHover').tooltip('hide');
            $('#emit' + id).removeClass('emitSpanHover');
        });
    }
}

$(function () {
    SourceMapVisualizer.init();
    SourceMapVisualizer.DragDrop.setup($('.fileDragPoint'));
    SourceMapVisualizer.DragDrop.setup($(document.body));
    SourceMapVisualizer.DragDrop.setup($(document.documentElement));
    SourceMapVisualizer.DragDrop.setup($(document));
});