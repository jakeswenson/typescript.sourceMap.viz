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

    (function (Display) {
        var spaceChar = '\xB7';

        function transformSpaces(text) {
            return text.replace(/ /g, spaceChar);
        }

        (function (Events) {
            var trackedClicks = new Set();

            function shouldHover(id) {
                //return !trackedClicks.has(id);
                return trackedClicks.size === 0;
            }

            function fireClick(id) {
                $(document).triggerHandler('segment.click', id);
            }
            Events.fireClick = fireClick;

            function fireHoverStart(evt, id) {
                //evt.stopPropagation();
                evt.preventDefault();
                $(document).triggerHandler('segment.hoverStart', id);
            }
            Events.fireHoverStart = fireHoverStart;

            function fireHoverEnd(evt, id) {
                evt.stopPropagation();
                evt.preventDefault();
                $(document).triggerHandler('segment.hoverEnd', id);
            }
            Events.fireHoverEnd = fireHoverEnd;

            function register() {
                $(document).on('segment.click', function (evt, id) {
                    var map = $('#map' + id);
                    var emit = $('#emit' + id);
                    var source = $('#source' + id);

                    var hasClicked = trackedClicks.has(id);
                    var color = Display.colors(id).toString();

                    if (hasClicked) {
                        trackedClicks.delete(id);
                        map.removeClass('emitSpan emitSpanHover').removeClass(color);
                        emit.removeClass('emitSpanHover');
                        source.removeClass('emitSpanHover');
                        ToolTips.hideToolTip();
                    } else {
                        trackedClicks.add(id);
                        map.addClass('emitSpan emitSpanHover').addClass(color);
                        emit.addClass('emitSpanHover');
                        source.addClass('emitSpanHover');
                        ToolTips.showToolTip(id);
                    }
                }).on('segment.hoverStart', function (evt, id) {
                    if (!shouldHover(id)) {
                        return;
                    }

                    SourceMapVisualizer.Display.ToolTips.showToolTip(id);

                    $('#map' + id).addClass('emitSpan emitSpanHover').css('background-color', Display.colors(id).toString());
                    $('#emit' + id).addClass('emitSpanHover');
                    $('#source' + id).addClass('emitSpanHover');
                }).on('segment.hoverEnd', function (evt, id) {
                    if (!shouldHover(id)) {
                        return;
                    }

                    SourceMapVisualizer.Display.ToolTips.hideToolTip();

                    $('#map' + id).removeClass('emitSpan emitSpanHover').css('background-color', '');
                    $('#source' + id).removeClass('emitSpanHover');
                    $('#emit' + id).removeClass('emitSpanHover');
                });
            }
            Events.register = register;
        })(Display.Events || (Display.Events = {}));
        var Events = Display.Events;

        (function (ToolTips) {
            ToolTips.tips = [];
            function showToolTip(id, hide) {
                if (typeof hide === "undefined") { hide = true; }
                if (ToolTips.tips.length > 0 && hide) {
                    ToolTips.tips.push(_.last(ToolTips.tips));
                    hideToolTip();
                }

                $('#map' + id).tooltip('show');
                $('#source' + id).tooltip('show');
                ToolTips.tips.push(id);
            }
            ToolTips.showToolTip = showToolTip;

            function hideToolTip() {
                var id = ToolTips.tips.pop();
                $('#map' + id).tooltip('hide');
                $('#source' + id).tooltip('hide');
                if (ToolTips.tips.length > 0) {
                    id = _.last(ToolTips.tips);
                    $('#map' + id).tooltip('show');
                    $('#source' + id).tooltip('show');
                }
            }
            ToolTips.hideToolTip = hideToolTip;
        })(Display.ToolTips || (Display.ToolTips = {}));
        var ToolTips = Display.ToolTips;

        Display.colors = d3.scale.ordinal().range(_.range(1, 11).map(function (n) {
            return 'color' + n;
        }));

        function createMappingSpan(segment) {
            return $('<span>').attr('id', 'map' + segment.id).attr('title', JSON.stringify(segment.decoded)).text(segment.segment).click(function () {
                return Events.fireClick(segment.id);
            }).hover(function (evt) {
                return Events.fireHoverStart(evt, segment.id);
            }, function (evt) {
                return Events.fireHoverEnd(evt, segment.id);
            }).tooltip({ trigger: 'manual' });
        }
        Display.createMappingSpan = createMappingSpan;

        function createSourceSpan(segment, text) {
            var color = Display.colors(segment.id).toString();
            var span = $('<span>').text(transformSpaces(text)).attr('title', ['line: ' + segment.line, 'column: ' + segment.column, 'length: ' + segment.length].join(', ')).attr('id', 'source' + segment.id).addClass('emitSpan').addClass(color).click(function () {
                return Events.fireClick(segment.id);
            }).hover(function (evt) {
                return Events.fireHoverStart(evt, segment.id);
            }, function (evt) {
                return Events.fireHoverEnd(evt, segment.id);
            }).tooltip({ trigger: 'manual' });

            return span;
        }
        Display.createSourceSpan = createSourceSpan;

        function createEmitSpan(segment, text) {
            var span = $('<span>');
            span.text(transformSpaces(text));

            if (!segment.isRaw) {
                var color = Display.colors(segment.id).toString();
                span.attr('id', 'emit' + segment.id).addClass('emitSpan').addClass(color).click(function () {
                    return Events.fireClick(segment.id);
                }).hover(function (evt) {
                    return Events.fireHoverStart(evt, segment.id);
                }, function (evt) {
                    return Events.fireHoverEnd(evt, segment.id);
                });
            }

            return span;
        }
        Display.createEmitSpan = createEmitSpan;

        function simpleSourceSpan(text) {
            return simpleSpan(text, true);
        }
        Display.simpleSourceSpan = simpleSourceSpan;

        function simpleSpan(text, showSpaces) {
            if (typeof showSpaces === "undefined") { showSpaces = false; }
            if (showSpaces) {
                text = transformSpaces(text);
            }

            return $('<span>').text(text);
        }
        Display.simpleSpan = simpleSpan;
    })(SourceMapVisualizer.Display || (SourceMapVisualizer.Display = {}));
    var Display = SourceMapVisualizer.Display;

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
                            SourceView.refreshSources(SourceMapVisualizer.Segments);
                        };
                        reader.readAsText(source);
                    });

                    EmittedSourceView.refreshEmittedSource();
                };

                setTimeout(function () {
                    emittedSourceFileReader.readAsText(emittedSourceFile);
                    SourceMaps.refreshSourceMapData();
                }, 1);
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
                        SourceMaps.refreshSourceMapData();
                        EmittedSourceView.refreshEmittedSource();
                        SourceView.refreshSources(SourceMapVisualizer.Segments);
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

    (function (SourceMaps) {
        SourceMaps.sourceMapData;

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
                            decoded: SourceMapVisualizer.decodeFully(seg)
                        };
                    });
                });

                SourceMaps.sourceMapData = {
                    map: map,
                    mappings: map.mappings,
                    lineMap: lineMap,
                    segments: segments
                };

                var content = JSON.stringify(map);
                var mappingsStr = '"mappings":"';

                var idx = content.indexOf(mappingsStr) + mappingsStr.length;

                var spans = [Display.simpleSpan(content.substr(0, idx))];
                var length = 0;

                _.forEach(SourceMaps.sourceMapData.segments, function (lineSeg, l) {
                    if (l > 0) {
                        spans.push(Display.simpleSpan(';'));
                        length++;
                    }
                    _.forEach(lineSeg, function (seg, s) {
                        if (s > 0) {
                            spans.push(Display.simpleSpan(','));
                            length++;
                        }
                        spans.push(Display.createMappingSpan(seg));
                        length += seg.segment.length;
                    });
                });

                spans.push(Display.simpleSpan(content.substr(idx + length)));

                var sm = $('#sourceMap');
                sm.html('');
                sm.append(spans);
            }
        }
        SourceMaps.refreshSourceMapData = refreshSourceMapData;
    })(SourceMapVisualizer.SourceMaps || (SourceMapVisualizer.SourceMaps = {}));
    var SourceMaps = SourceMapVisualizer.SourceMaps;

    var EmittedSourceView;
    (function (EmittedSourceView) {
        function collectSegments(emittedSource) {
            var segments = [];
            var adjustment = 0;
            var lineOffset = 0;
            var content = emittedSource.content;
            var mapSegments = SourceMaps.sourceMapData.segments;

            mapSegments.forEach(function (lineSegments, lineNumber) {
                var lastLineOffset = 0;
                var eol = emittedSource.lineMap[lineNumber].length + 1;

                //console.log('Line', lineNumber, 'length', eol);
                lineSegments.forEach(function (segment, segmentNumber) {
                    var data = segment.decoded;

                    if (data.length < 1) {
                        segments.push({
                            id: segment.id,
                            lineNumber: lineNumber,
                            segmentNumber: segmentNumber,
                            isRaw: true,
                            offset: lineOffset,
                            length: eol
                        });
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
                    var nextSegment = mapSegments[lineNumber][segmentNumber + 1];
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

                    var span = Display.createEmitSpan(segment, emittedSource.content.substr(segment.offset, segment.length));
                    emittedSourceEl.append(span);
                    offset += segment.length;
                });
            }
        }
        EmittedSourceView.refreshEmittedSource = refreshEmittedSource;
    })(EmittedSourceView || (EmittedSourceView = {}));

    var SourceView;
    (function (SourceView) {
        function containsCurrentSpan(span, otherSpan) {
            return otherSpan.containedSpans && otherSpan.containedSpans.has(span.id);
        }

        function endsBefore(span, otherSpan) {
            if (span.length === undefined) {
                return true;
            }

            return (otherSpan.column + otherSpan.length) <= (span.column + span.length);
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

            sourceSpans.forEach(function (span) {
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
            var lastLine = -1;
            rootSpans.forEach(function (span) {
                var line = span.line;

                //console.log('line', line, 'col', span.column);
                var isNewLine = line !== lastLine;
                var multiLine = (line - lastLine) >= 2;
                var hasLeader = span.column !== 0;

                if (multiLine) {
                    _.range(lastLine + 1, line).forEach(function (line) {
                        spans.push(Display.simpleSourceSpan(sourceFile.lineMap[line] + '\n'));
                    });
                }

                lastLine = line;

                if (isNewLine && hasLeader) {
                    spans.push(Display.simpleSourceSpan(sourceFile.lineMap[line].substr(0, span.column)));
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

                        start += offset + span.length;
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
                            return Display.simpleSourceSpan(i.text);
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
        SourceView.refreshSources = refreshSources;
    })(SourceView || (SourceView = {}));

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
