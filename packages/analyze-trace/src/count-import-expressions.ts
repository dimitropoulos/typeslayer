// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import stream = require("stream");
import TriviaStateMachine = require("./trivia-state-machine");

/**
 * @param stream A stream of string chunks with respect to which `positions` should be normalized.
 * @returns A frequency table of imported module names.
 */
function countImportExpressions(stream: stream.Readable): Promise<Map<string, number>> {
    return new Promise<Map<string, number>>((resolve, reject) => {
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

        const target = "import("; // tsc doesn't emit a space before the lparen
        let targetPos = 0;

        const buf: number[] = [];

        const frequency = new Map<string, number>();

        let stateMachine = TriviaStateMachine.create();

        function onChar(ch: number, nextCh: number) {
            const { charKind } = stateMachine.step(ch, nextCh);

            if (targetPos === target.length) {
                if (charKind === "string") {
                    buf.push(ch);
                }
                else {
                    const name = String.fromCharCode(...buf);

                    if (!frequency.has(name)) {
                        frequency.set(name, 0);
                    }
                    frequency.set(name, frequency.get(name)! + 1);

                    targetPos = 0;
                    buf.length = 0;
                }
            }
            else if (charKind === "code" && ch === target.charCodeAt(targetPos)) {
                targetPos++;
            }
            else {
                targetPos = 0;
            }
        }

        function onEof() {
            resolve(frequency);
        }
    });
}

export = countImportExpressions;