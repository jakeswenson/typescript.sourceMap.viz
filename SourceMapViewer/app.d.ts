declare module SourceMapVisualizer {
    function decodeFully(value: string): number[];
    interface RawSegment {
        id: number;
        segment: string;
        decoded: number[];
    }
    interface Segment {
        id: number;
        lineNumber: number;
        segmentNumber: number;
        offset: number;
        length: number;
        sourceLine?: number;
        sourceOffset?: number;
        isRaw?: boolean;
    }
    interface SourceSegment {
        id: number;
        line: number;
        column: number;
    }
    interface TextFile {
        name: string;
        type: string;
        content: string;
        lineMap?: string[];
    }
    interface SourceInfo {
        [file: string]: TextFile;
        emittedSource?: TextFile;
        source?: TextFile;
        sourceMap?: TextFile;
    }
    interface SourceSpan extends SourceSegment {
        length?: number;
        containedSpans?: Set<number>;
        isContainedInSpan?: boolean;
    }
    var Segments: Segment[];
    var sources: SourceInfo;
    module Display {
        module Events {
            function fireClick(id: number): void;
            function fireHoverStart(evt: any, id: any): void;
            function fireHoverEnd(evt: any, id: any): void;
            function register(): void;
        }
        module ToolTips {
            var tips: number[];
            function showToolTip(id: number, hide?: boolean): void;
            function hideToolTip(): void;
        }
        var colors: D3.Scale.OrdinalScale;
        function createMappingSpan(segment: RawSegment): JQuery;
        function createSourceSpan(segment: SourceSpan, text: string): JQuery;
        function createEmitSpan(segment: Segment, text: string): JQuery;
        function simpleSourceSpan(text: string): JQuery;
        function simpleSpan(text: any, showSpaces?: boolean): JQuery;
    }
    module DragDrop {
        function handleDrop(e: JQueryEventObject): void;
        function setup(dropbox: JQuery): void;
    }
    module SourceMaps {
        var sourceMapData: {
            mappings: string;
            lineMap: string[];
            segments: RawSegment[][];
            map: any;
        };
        function refreshSourceMapData(): void;
    }
    function init(): void;
}
