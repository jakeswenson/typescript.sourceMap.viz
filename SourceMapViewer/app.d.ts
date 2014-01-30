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
    var Segments: Segment[];
    var sources: SourceInfo;
    module DragDrop {
        function handleDrop(e: JQueryEventObject): void;
        function setup(dropbox: JQuery): void;
    }
    var sourceMapData: {
        mappings: string;
        lineMap: string[];
        segments: RawSegment[][];
        map: any;
    };
    function refresh(): void;
    function init(): void;
}
