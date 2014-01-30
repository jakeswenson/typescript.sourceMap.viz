var SourceMapVisualizer;
(function (SourceMapVisualizer) {
    function decodeFully(value) {
        var result = [];
        while (value && value !== "") {
            var decoded = TypeScript.Base64VLQFormat.decode(value);
            result.push(decoded.value);
            value = decoded.rest;
        }
        return result;
    }
    SourceMapVisualizer.decodeFully = decodeFully;

    SourceMapVisualizer.Segments = null;
    SourceMapVisualizer.sources = {};

    var Display;
    (function (Display) {
        (function (Events) {
            function register() {
                $(document).on('segment.click', function (evt, id) {
                    console.log('clicked', id);

                    var map = $('#map' + id);
                    var emit = $('#emit' + id);

                    map.toggleClass('emitSpan emitSpanHover').css('background-color', function (i, value) {
                        return Display.colors(id).toString();
                    });

                    emit.toggleClass('emitSpanHover');
                }).on('segment.hoverStart', function (evt, id) {
                    Display.ToolTips.showToolTip(id);
                    $('#map' + id).addClass('emitSpan emitSpanHover').css('background-color', Display.colors(id).toString());
                    $('#emit' + id).addClass('emitSpanHover');
                    $('#source' + id).addClass('emitSpanHover');
                }).on('segment.hoverEnd', function (evt, id) {
                    Display.ToolTips.hideToolTip();
                    $('#map' + id).removeClass('emitSpan emitSpanHover').css('background-color', '');
                    $('#source' + id).removeClass('emitSpanHover');
                    $('#emit' + id).removeClass('emitSpanHover');
                });
            }
            Events.register = register;
        })(Display.Events || (Display.Events = {}));
        var Events = Display.Events;

        (function (ToolTips) {
            var showTip = [];
            function showToolTip(id) {
                if (showTip !== undefined) {
                    var item = showTip.pop();
                    showTip.push(item, item);
                    hideToolTip();
                }

                $('#map' + id).tooltip('show');
                $('#source' + id).tooltip('show');
                showTip.push(id);
            }
            ToolTips.showToolTip = showToolTip;

            function hideToolTip() {
                var id = showTip.pop();
                $('#map' + id).tooltip('hide');
                $('#source' + id).tooltip('hide');
                if (showTip.length > 0) {
                    id = _.last(showTip);
                    $('#map' + id).tooltip('show');
                    $('#source' + id).tooltip('show');
                }
            }
            ToolTips.hideToolTip = hideToolTip;
        })(Display.ToolTips || (Display.ToolTips = {}));
        var ToolTips = Display.ToolTips;

        Display.colors = d3.scale.ordinal().range(['#aec7e8', '#ff7f0e', '#ff9896', '#f7b6d2', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5']);

        function createMappingSpan(segment) {
            return $('<span>').attr('id', 'map' + segment.id).attr('title', JSON.stringify(segment.decoded)).text(segment.segment).click(function () {
                $(document).triggerHandler('segment.click', segment.id);
            }).tooltip({ trigger: 'manual' });
        }
        Display.createMappingSpan = createMappingSpan;

        function createSourceSpan(segment, text) {
            var color = Display.colors(segment.id).toString();
            var span = $('<span>').text(text).attr('title', JSON.stringify({ line: segment.line, col: segment.column, len: segment.length })).attr('id', 'source' + segment.id).addClass('emitSpan').css('background-color', color).hover(function (evt) {
                evt.stopPropagation();
                evt.preventDefault();
                $(document).triggerHandler('segment.hoverStart', segment.id);
            }, function (evt) {
                evt.stopPropagation();
                evt.preventDefault();
                $(document).triggerHandler('segment.hoverEnd', segment.id);
            }).tooltip({ trigger: 'manual' });

            return span;
        }
        Display.createSourceSpan = createSourceSpan;

        function createSpan(segment, text) {
            var span = $('<span>');
            span.text(text);

            if (!segment.isRaw) {
                var color = Display.colors(segment.id).toString();
                span.attr('id', 'emit' + segment.id).addClass('emitSpan').css('background-color', color).hover(function (evt) {
                    evt.stopPropagation();
                    evt.preventDefault();
                    $(document).triggerHandler('segment.hoverStart', segment.id);
                }, function (evt) {
                    evt.stopPropagation();
                    evt.preventDefault();
                    $(document).triggerHandler('segment.hoverEnd', segment.id);
                });
            }

            return span;
        }
        Display.createSpan = createSpan;

        function simpleSpan(text) {
            return $('<span>').text(text);
        }
        Display.simpleSpan = simpleSpan;
    })(Display || (Display = {}));

    (function (DragDrop) {
        function handleBundleDrop(mapFile, otherFiles) {
            var mapReader = new FileReader();
            mapReader.onload = function (evt) {
                var mapContents = mapReader.result;
                $('#sourceMap').text(mapReader.result);
                $('#emitted').removeClass('hidden');

                SourceMapVisualizer.sources.sourceMap = { name: mapFile.name, type: mapFile.type, content: mapContents };
                var mapData = JSON.parse(mapContents);

                var emittedSourceFile = _.find(otherFiles, function (file) {
                    return file.name === mapData.file;
                });
                if (!emittedSourceFile) {
                    return;
                }

                var sourceFiles = _.reject(otherFiles, function (file) {
                    return file.name === mapData.file;
                });
                var emittedSourceFileReader = new FileReader();
                emittedSourceFileReader.onload = function () {
                    SourceMapVisualizer.sources.emittedSource = {
                        name: emittedSourceFile.name,
                        type: emittedSourceFile.type,
                        content: emittedSourceFileReader.result
                    };

                    $('#emittedSourceRaw').text(emittedSourceFileReader.result);
                    $('#sourceCode').removeClass('hidden');

                    _.forEach(sourceFiles, function (source) {
                        var reader = new FileReader();

                        // TODO: assumes only one for now
                        reader.onload = function () {
                            SourceMapVisualizer.sources.source = { name: source.name, type: source.type, content: reader.result };
                            $('#sourceRaw').text(reader.result);
                            refreshSources(SourceMapVisualizer.Segments);
                        };
                        reader.readAsText(source);
                    });

                    SourceMapVisualizer.refresh();
                };

                emittedSourceFileReader.readAsText(emittedSourceFile);
                SourceMapVisualizer.refresh();
            };
            mapReader.readAsText(mapFile);
        }

        function handleDrop(e) {
            var _this = this;
            e.stopPropagation();
            e.preventDefault();

            var files = e.originalEvent.dataTransfer.files;

            var mapFile = _.find(files, function (file) {
                return /\.map$/.test(file.name);
            });
            var otherFiles = _.reject(files, function (file) {
                return /\.map$/.test(file.name);
            });

            if (mapFile && files.length > 1) {
                handleBundleDrop(mapFile, otherFiles);
            } else {
                for (var i = 0, len = files.length; i < len; i++) {
                    var file = files[i];
                    var fr = new FileReader();
                    fr.onload = function () {
                        SourceMapVisualizer.sources[$(_this).data('target')] = { name: file.name, type: file.type, content: fr.result };
                        $('#' + $(_this).data('target')).text(fr.result);
                        $('#' + $(_this).data('next')).removeClass('hidden');
                        SourceMapVisualizer.refresh();
                    };
                    fr.readAsText(file);
                }
            }
        }
        DragDrop.handleDrop = handleDrop;

        function setup(dropbox) {
            function none(evt) {
                evt.stopPropagation();
                evt.preventDefault();
            }
            dropbox.on("dragenter", none);
            dropbox.on("dragexit", none);
            dropbox.on("dragover", none);
            dropbox.on('drop', SourceMapVisualizer.DragDrop.handleDrop);
        }
        DragDrop.setup = setup;
    })(SourceMapVisualizer.DragDrop || (SourceMapVisualizer.DragDrop = {}));
    var DragDrop = SourceMapVisualizer.DragDrop;

    SourceMapVisualizer.sourceMapData;

    function refreshSourceMapData() {
        var sourceMap = SourceMapVisualizer.sources.sourceMap;
        if (sourceMap && sourceMap.content) {
            var map = JSON.parse(sourceMap.content);
            var lineMap = map.mappings.split(';');
            var id = 0;
            var segments = _.map(lineMap, function (line) {
                return line.split(',').map(function (seg) {
                    return {
                        id: id++,
                        segment: seg,
                        decoded: decodeFully(seg)
                    };
                });
            });

            SourceMapVisualizer.sourceMapData = {
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

            var spans = [span(content.substr(0, idx))];
            var length = 0;

            _.forEach(SourceMapVisualizer.sourceMapData.segments, function (lineSeg, l) {
                if (l > 0) {
                    spans.push(span(';'));
                    length++;
                }
                _.forEach(lineSeg, function (seg, s) {
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

    function collectSegments(emittedSource) {
        var segments = [];
        var adjustment = 0;
        var lineOffset = 0;
        var content = emittedSource.content;

        _.forEach(SourceMapVisualizer.sourceMapData.segments, function (lineSegments, lineNumber) {
            var lastLineOffset = 0;
            var eol = emittedSource.lineMap[lineNumber].length + 1;

            //console.log('Line', lineNumber, 'length', eol);
            _.forEach(lineSegments, function (segment, segmentNumber) {
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
                var nextSegment = SourceMapVisualizer.sourceMapData.segments[lineNumber][segmentNumber + 1];
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
        var emittedSource = SourceMapVisualizer.sources.emittedSource;
        if (emittedSource && emittedSource.content) {
            emittedSource.lineMap = emittedSource.content.split('\n');

            var segments = collectSegments(emittedSource);
            SourceMapVisualizer.Segments = segments;

            var emittedSourceEl = $('#emittedSource');
            emittedSourceEl.html('');

            var offset = 0;
            segments.forEach(function (segment) {
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

    function refreshSources(segments) {
        var sourceFile = SourceMapVisualizer.sources.source;
        sourceFile.lineMap = sourceFile.content.split('\n');

        var line = 0;
        var col = 0;
        var sourceSegs = _.filter(segments, function (seg) {
            return !seg.isRaw;
        }).map(function (seg) {
            var s = {
                column: seg.sourceOffset || 0,
                line: seg.sourceLine || 0,
                id: seg.id
            };
            return s;
        });

        var sourceSpans = [];

        sourceSegs.reduce(function (prev, cur) {
            var line = prev.line + cur.line;
            var col = prev.column + cur.column;
            var item = { id: cur.id, line: line, column: col };
            sourceSpans.push(item);
            if (prev.line === line) {
                prev.length = cur.column;
            }
            return item;
        }, { id: 0, line: 0, column: 0 });

        sourceSpans.sort(function (a, b) {
            return a.line - b.line || a.column - b.column;
        });

        var spanMap = new Map();

        sourceSpans.forEach(function (span) {
            spanMap.set(span.id, span);
        });

        function containsCurrentSpan(span, otherSpan) {
            return otherSpan.containedSpans && otherSpan.containedSpans.has(span.id);
        }

        function endsBefore(span, otherSpan) {
            if (span.length === undefined) {
                return true;
            }

            return (otherSpan.column + otherSpan.length) <= (span.column + span.length);
        }

        _.forEach(sourceSpans, function (span) {
            var containedSpans = _.filter(sourceSpans, function (otherSpan) {
                var spanLength = span.length === undefined ? otherSpan.length : span.length;
                return span.id !== otherSpan.id && !otherSpan.isContainedInSpan && span.line === otherSpan.line && span.column <= otherSpan.column && endsBefore(span, otherSpan) && !containsCurrentSpan(span, otherSpan);
            });

            if (containedSpans.length > 0) {
                span.containedSpans = new Set();
                containedSpans.forEach(function (containedSpan) {
                    span.containedSpans.add(containedSpan.id);
                    containedSpan.isContainedInSpan = true;
                });
            }
        });

        var rootSpans = sourceSpans.filter(function (s) {
            return !s.isContainedInSpan;
        });

        //console.log('done', ss.length);
        //sourceSpans.forEach(span => console.log('id', span.id, 'line', span.line, 'col', span.column, 'len', span.length));
        var spans = [];
        var lastLine = 0;
        rootSpans.forEach(function (span) {
            var line = span.line;

            //console.log('line', line, 'col', span.column);
            var isNewLine = line !== lastLine;
            var multiLine = (line - lastLine) >= 2;
            lastLine = line;
            var hasLeader = span.column !== 0;

            if (multiLine) {
                _.range(lastLine + 1, line).forEach(function (line) {
                    spans.push(Display.simpleSpan(sourceFile.lineMap[line] + '\n'));
                });
            }

            if (isNewLine && hasLeader) {
                spans.push(Display.simpleSpan(sourceFile.lineMap[line].substr(0, span.column)));
            }

            var text;

            if (span.length === undefined) {
                text = sourceFile.lineMap[line].substr(span.column) + '\n';
            } else {
                text = sourceFile.lineMap[line].substr(span.column, span.length);
            }

            var spanText = [];

            function breakText(parentSpan, text, containedSpans) {
                var start = 0;
                containedSpans.forEach(function (id) {
                    var span = spanMap.get(id);

                    var offset = span.column - parentSpan.column;

                    if (offset > start) {
                        spanText.push({
                            span: null,
                            text: text.substr(start, offset)
                        });
                    }

                    var subText = text.substr(offset, span.length);

                    if (span.containedSpans) {
                        breakText(span, subText, span.containedSpans);
                    } else {
                        spanText.push({
                            span: span,
                            text: subText
                        });
                    }

                    start += (offset - start) + span.length;
                });

                if (start < text.length) {
                    spanText.push({ span: null, text: text.substr(start) });
                }
            }

            if (span.containedSpans) {
                breakText(span, text, span.containedSpans);
                var result = Display.createSourceSpan(span, '').append(spanText.map(function (i) {
                    if (i.span) {
                        return Display.createSourceSpan(i.span, i.text);
                    } else {
                        return Display.simpleSpan(i.text);
                    }
                }));
                spans.push(result);
            } else {
                spans.push(Display.createSourceSpan(span, text));
            }
        });

        $('#source').html('');
        $('#source').append(spans);
    }

    function refresh() {
        refreshSourceMapData();
        refreshEmittedSource();
    }
    SourceMapVisualizer.refresh = refresh;

    function init() {
        Display.Events.register();
    }
    SourceMapVisualizer.init = init;
})(SourceMapVisualizer || (SourceMapVisualizer = {}));

$(function () {
    SourceMapVisualizer.init();
    SourceMapVisualizer.DragDrop.setup($('.fileDragPoint'));
    SourceMapVisualizer.DragDrop.setup($(document.body));
    SourceMapVisualizer.DragDrop.setup($(document.documentElement));
    SourceMapVisualizer.DragDrop.setup($(document));
});
//# sourceMappingURL=app.js.map
