// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import stream = require("stream");
import TriviaStateMachine = require("./trivia-state-machine");

namespace normalizePositions {
    export type LineChar = readonly [line: number, char: number];
}

type MutableLineChar = [line: number, char: number];
type LineChar = normalizePositions.LineChar;

interface PositionWrapper {
    returnIndex: number;
    offset?: number;
    lineChar?: LineChar;
}

let freezeCache: LineChar = [-1, -1];
function freeze(lineChar: MutableLineChar): LineChar {
    if (lineChar[0] !== freezeCache[0] || lineChar[1] !== freezeCache[1]) {
        freezeCache = [lineChar[0], lineChar[1]];
    }

    return freezeCache;
}

function compareOffsets(a: number, b: number): number {
    return a - b;
}

function compareLineChars(a: LineChar, b: LineChar): number {
    return a[0] - b[0] || a[1] - b[1];
}

/**
 * @param stream A stream of string chunks with respect to which `positions` should be normalized.
 * @param positions Positions to be normalized.  NB: negative numbers will be treated as positions
 * that should be converted to line-char without but not moved past trivia.
 * @returns A list of normalized line-char positions.
 */
function normalizePositions(stream: stream.Readable, positions: ReadonlyArray<number | LineChar>): Promise<ReadonlyArray<LineChar>> {
    return positions.length === 0 ? Promise.resolve([]) : new Promise<ReadonlyArray<LineChar>>((resolve, reject) => {
        let prevCh = -1;

        stream.on("error", err => reject(err));

        // The actual event handling is in onChar and onEof below.
        // These handlers provided a simplified current- and next-char view.
        stream.on("data", chunk => {
            const text = chunk as string;
            const length = text.length;
            for (let i = 0; i < length; i++) {
                const ch = text.charCodeAt(i);
                if (prevCh >= 0) {
                    onChar(prevCh, ch);
                }
                prevCh = ch;
            }
        });

        stream.on("close", () => {
            if (prevCh >= 0) {
                onChar(prevCh, -1);
            }

            onEof();
        });

        // We partition the positions because the varieties
        // cannot be sorted with respect to each other.
        const fixedOffsetWrappers: PositionWrapper[] = []; // Don't skip trivia
        const offsetWrappers: PositionWrapper[] = []; // Do skip trivia
        const fixedLineCharWrappers: PositionWrapper[] = []; // Don't skip trivia
        const lineCharWrappers: PositionWrapper[] = []; // Do skip trivia

        for (let i = 0; i < positions.length; i++) {
            const position = positions[i];
            if (typeof position === "number") {
                if (position < 0) {
                    fixedOffsetWrappers.push({
                        returnIndex: i,
                        offset: -position,
                    });
                }
                else {
                    offsetWrappers.push({
                        returnIndex: i,
                        offset: position,
                    });
                }
            }
            else {
                if (position[0] < 0 || position[1] < 0) {
                    fixedLineCharWrappers.push({
                        returnIndex: i,
                        lineChar: [Math.abs(position[0]), Math.abs(position[1])],
                    });
                }
                else {
                    lineCharWrappers.push({
                        returnIndex: i,
                        lineChar: position,
                    });
                }
            }
        }

        fixedOffsetWrappers.sort((a, b) => compareOffsets(a.offset!, b.offset!));
        offsetWrappers.sort((a, b) => compareOffsets(a.offset!, b.offset!));
        fixedLineCharWrappers.sort((a, b) => compareLineChars(a.lineChar!, b.lineChar!));
        lineCharWrappers.sort((a, b) => compareLineChars(a.lineChar!, b.lineChar!));

        let fixedOffsetWrappersPos = 0;
        let offsetWrappersPos = 0;
        let fixedLineCharWrappersPos = 0;
        let lineCharWrappersPos = 0;

        let currOffset = 0;
        let currLineChar: MutableLineChar = [1, 1];
        let stateMachine = TriviaStateMachine.create();

        function onChar(ch: number, nextCh: number) {
            const { charKind, wrapLine } = stateMachine.step(ch, nextCh);
            const isTrivia = charKind === "comment" || charKind === "whitespace";

            // This is handy when debugging
            // console.error(`${currOffset}\t${/^[a-zA-Z0-9!@#$%^&*()[\]{}\\/;':"<,>.?`~+=_\-]$/.test(String.fromCharCode(ch)) ? String.fromCharCode(ch) : "0x" + ch.toString(16)}\t(${currLineChar[0]},${currLineChar[1]})\t${charKind}`);

            for (; fixedOffsetWrappersPos < fixedOffsetWrappers.length && compareOffsets(fixedOffsetWrappers[fixedOffsetWrappersPos].offset!, currOffset) <= 0; fixedOffsetWrappersPos++) {
                fixedOffsetWrappers[fixedOffsetWrappersPos].offset = currOffset;
                fixedOffsetWrappers[fixedOffsetWrappersPos].lineChar = freeze(currLineChar);
            }

            for (; fixedLineCharWrappersPos < fixedLineCharWrappers.length && compareLineChars(fixedLineCharWrappers[fixedLineCharWrappersPos].lineChar!, currLineChar) <= 0; fixedLineCharWrappersPos++) {
                fixedLineCharWrappers[fixedLineCharWrappersPos].offset = currOffset;
                fixedLineCharWrappers[fixedLineCharWrappersPos].lineChar = freeze(currLineChar);
            }

            if (!isTrivia) {
                for (; offsetWrappersPos < offsetWrappers.length && compareOffsets(offsetWrappers[offsetWrappersPos].offset!, currOffset) <= 0; offsetWrappersPos++) {
                    offsetWrappers[offsetWrappersPos].offset = currOffset;
                    offsetWrappers[offsetWrappersPos].lineChar = freeze(currLineChar);
                }

                for (; lineCharWrappersPos < lineCharWrappers.length && compareLineChars(lineCharWrappers[lineCharWrappersPos].lineChar!, currLineChar) <= 0; lineCharWrappersPos++) {
                    lineCharWrappers[lineCharWrappersPos].offset = currOffset;
                    lineCharWrappers[lineCharWrappersPos].lineChar = freeze(currLineChar);
                }
            }

            currOffset++;

            if (wrapLine) {
                currLineChar[0]++;
                currLineChar[1] = 1;
            }
            else {
                currLineChar[1]++;
            }

            // TODO (https://github.com/microsoft/typescript-analyze-trace/issues/4)
        }

        function onEof() {
            const result: LineChar[] = [];

            const eofLineChar = freeze(currLineChar);

            for (let i = 0; i < fixedOffsetWrappersPos; i++) {
                const wrapper = fixedOffsetWrappers[i];
                result[wrapper.returnIndex] = wrapper.lineChar!;
            }

            for (let i = fixedOffsetWrappersPos; i < fixedOffsetWrappers.length; i++) {
                const wrapper = fixedOffsetWrappers[i];
                result[wrapper.returnIndex] = eofLineChar;
            }

            for (let i = 0; i < offsetWrappersPos; i++) {
                const wrapper = offsetWrappers[i];
                result[wrapper.returnIndex] = wrapper.lineChar!;
            }

            for (let i = offsetWrappersPos; i < offsetWrappers.length; i++) {
                const wrapper = offsetWrappers[i];
                result[wrapper.returnIndex] = eofLineChar;
            }

            for (let i = 0; i < fixedLineCharWrappersPos; i++) {
                const wrapper = fixedLineCharWrappers[i];
                result[wrapper.returnIndex] = wrapper.lineChar!;
            }

            for (let i = fixedLineCharWrappersPos; i < fixedLineCharWrappers.length; i++) {
                const wrapper = fixedLineCharWrappers[i];
                result[wrapper.returnIndex] = eofLineChar;
            }

            for (let i = 0; i < lineCharWrappersPos; i++) {
                const wrapper = lineCharWrappers[i];
                result[wrapper.returnIndex] = wrapper.lineChar!;
            }

            for (let i = lineCharWrappersPos; i < lineCharWrappers.length; i++) {
                const wrapper = lineCharWrappers[i];
                result[wrapper.returnIndex] = eofLineChar;
            }

            resolve(result);
        }
    });
}

export = normalizePositions;