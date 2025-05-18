// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const code_CarriageReturn = "\r".charCodeAt(0);
const code_NewLine = "\n".charCodeAt(0);
const code_Space = " ".charCodeAt(0);
const code_Tab = "\t".charCodeAt(0);
const code_Slash = "/".charCodeAt(0);
const code_Backslash = "\\".charCodeAt(0);
const code_Star = "*".charCodeAt(0);
const code_Hash = "#".charCodeAt(0);
const code_Bang = "!".charCodeAt(0);
const code_SingleQuote = "'".charCodeAt(0);
const code_DoubleQuote = "\"".charCodeAt(0);
const code_OpenBrace = "{".charCodeAt(0);
const code_CloseBrace = "}".charCodeAt(0);
const code_OpenBracket = "[".charCodeAt(0);
const code_CloseBracket = "]".charCodeAt(0);
const code_Backtick = "`".charCodeAt(0);
const code_Dollar = "$".charCodeAt(0);

const enum State {
    Uninitialized,
    Default,
    StartSingleLineComment,
    SingleLineComment,
    StartMultiLineComment,
    MultiLineComment,
    EndMultiLineComment,
    StartShebangComment,
    ShebangComment,
    SingleQuoteString,
    SingleQuoteStringEscapeBackslash,
    SingleQuoteStringEscapeQuote,
    DoubleQuoteString,
    DoubleQuoteStringEscapeBackslash,
    DoubleQuoteStringEscapeQuote,
    TemplateString,
    TemplateStringEscapeBackslash,
    TemplateStringEscapeQuote,
    StartExpressionHole,
    Regex,
    RegexEscapeBackslash,
    RegexEscapeSlash,
    RegexEscapeOpenBracket,
    CharClass,
    CharClassEscapeBackslash,
    CharClassEscapeCloseBracket,
}

export type CharKind =
    | "whitespace"
    | "comment"
    | "string"
    | "regex"
    | "code"
    ;

interface StepResult {
    charKind: CharKind;
    wrapLine: boolean;
}

export interface StateMachine {
    step(ch: number, nextCh: number): StepResult;
}

export function create(): StateMachine {
    let state = State.Default;
    let braceDepth = 0;
    let templateStringBraceDepthStack: number[] = [];
    let isBOF = true;

    function step(ch: number, nextCh: number): StepResult {
        let nextStateId = State.Uninitialized;;
        let wrapLine = false;
        switch (ch) {
            case code_CarriageReturn:
                if (nextCh === code_NewLine) {
                    if (state === State.ShebangComment ||
                        state === State.SingleLineComment ||
                        // Cases below are for error recovery
                        state === State.SingleQuoteString ||
                        state === State.DoubleQuoteString ||
                        state === State.Regex ||
                        state === State.CharClass) {
                        state = State.Default;
                    }
                    break;
                }
                // Fall through
            case code_NewLine:
                wrapLine = true;
                if (state === State.ShebangComment ||
                    state === State.SingleLineComment) {
                    state = State.Default;
                }
                else if (state === State.SingleQuoteString || // Error recovery
                    state === State.DoubleQuoteString) { // Error recovery
                    state = State.Default;
                }
                break;

            case code_Slash:
                if (state === State.Default) {
                    if (nextCh === code_Slash) {
                        state = State.StartSingleLineComment;
                    }
                    else if (nextCh === code_Star) {
                        // It seems like there might technically be a corner case where this is the beginning of an invalid regex
                        state = State.StartMultiLineComment;
                    }
                    else {
                        // TODO (https://github.com/microsoft/typescript-analyze-trace/issues/14): this is too aggressive - it will catch division
                        state = State.Regex;
                    }
                }
                else if (state === State.StartSingleLineComment) {
                    state = State.SingleLineComment;
                }
                else if (state === State.EndMultiLineComment) {
                    nextStateId = State.Default;
                }
                else if (state === State.Regex) {
                    nextStateId = State.Default;
                }
                else if (state === State.RegexEscapeSlash) {
                    nextStateId = State.Regex;
                }
                break;

            case code_Star:
                if (state === State.StartMultiLineComment) {
                    state = State.MultiLineComment;
                }
                else if (state === State.MultiLineComment) {
                    if (nextCh === code_Slash) {
                        state = State.EndMultiLineComment;
                    }
                }
                break;

            case code_Hash:
                if (isBOF && state === State.Default && nextCh === code_Bang) {
                    state = State.StartShebangComment;
                }
                break;

            case code_Bang:
                if (state === State.StartShebangComment) {
                    state = State.ShebangComment;
                }
                break;

            case code_SingleQuote:
                if (state === State.Default) {
                    state = State.SingleQuoteString;
                }
                else if (state === State.SingleQuoteStringEscapeQuote) {
                    nextStateId = State.SingleQuoteString;
                }
                else if (state === State.SingleQuoteString) {
                    nextStateId = State.Default;
                }
                break;

            case code_DoubleQuote:
                if (state === State.Default) {
                    state = State.DoubleQuoteString;
                }
                else if (state === State.DoubleQuoteStringEscapeQuote) {
                    nextStateId = State.DoubleQuoteString;
                }
                else if (state === State.DoubleQuoteString) {
                    nextStateId = State.Default;
                }
                break;

            case code_Backtick:
                if (state === State.Default) {
                    state = State.TemplateString;
                }
                else if (state === State.TemplateStringEscapeQuote) {
                    nextStateId = State.TemplateString;
                }
                else if (state === State.TemplateString) {
                    nextStateId = State.Default;
                }
                break;

            case code_Backslash:
                if (state === State.SingleQuoteString) {
                    if (nextCh === code_SingleQuote) {
                        state = State.SingleQuoteStringEscapeQuote;
                    }
                    else if (nextCh === code_Backslash) {
                        state = State.SingleQuoteStringEscapeBackslash;
                    }
                }
                else if (state === State.DoubleQuoteString) {
                    if (nextCh === code_DoubleQuote) {
                        state = State.DoubleQuoteStringEscapeQuote;
                    }
                    else if (nextCh === code_Backslash) {
                        state = State.DoubleQuoteStringEscapeBackslash;
                    }
                }
                else if (state === State.TemplateString) {
                    if (nextCh === code_Backtick) {
                        state = State.TemplateStringEscapeQuote;
                    }
                    else if (nextCh === code_Backslash) {
                        state = State.TemplateStringEscapeBackslash;
                    }
                }
                else if (state === State.Regex) {
                    if (nextCh === code_OpenBracket) {
                        state = State.RegexEscapeOpenBracket;
                    }
                    else if (nextCh === code_Slash) {
                        state = State.RegexEscapeSlash;
                    }
                    else if (nextCh === code_Backslash) {
                        state = State.RegexEscapeBackslash;
                    }
                }
                else if (state === State.CharClass) {
                    if (nextCh === code_CloseBracket) {
                        state = State.CharClassEscapeCloseBracket;
                    }
                    else if (nextCh === code_Backslash) {
                        state = State.CharClassEscapeBackslash;
                    }
                }
                else if (state === State.SingleQuoteStringEscapeBackslash) {
                    nextStateId = State.SingleQuoteString;
                }
                else if (state === State.DoubleQuoteStringEscapeBackslash) {
                    nextStateId = State.DoubleQuoteString;
                }
                else if (state === State.TemplateStringEscapeBackslash) {
                    nextStateId = State.TemplateString;
                }
                else if (state === State.RegexEscapeBackslash) {
                    nextStateId = State.Regex;
                }
                else if (state === State.CharClassEscapeBackslash) {
                    nextStateId = State.CharClass;
                }
                break;

            case code_Dollar:
                if (state === State.TemplateString && nextCh === code_OpenBrace) {
                    state = State.StartExpressionHole;
                }
                break;

            case code_OpenBrace:
                if (state === State.Default) {
                    braceDepth++;
                }
                else if (state === State.StartExpressionHole) {
                    templateStringBraceDepthStack.push(braceDepth);
                    nextStateId = State.Default;
                }
                break;

            case code_CloseBrace:
                if (templateStringBraceDepthStack.length && braceDepth === templateStringBraceDepthStack[templateStringBraceDepthStack.length - 1]) {
                    templateStringBraceDepthStack.pop();
                    state = State.TemplateString;
                }
                else if (state === State.Default && braceDepth > 0) { // Error recovery
                    braceDepth--;
                }
                break;

            case code_OpenBracket:
                if (state === State.RegexEscapeOpenBracket) {
                    nextStateId = State.Regex;
                }
                else if (state === State.Regex) {
                    state = State.CharClass;
                }
                break;

            case code_CloseBracket:
                if (state === State.CharClassEscapeCloseBracket) {
                    nextStateId = State.CharClass;
                }
                else if (state === State.CharClass) {
                    nextStateId = State.Regex;
                }
                break;
        }

        let charKind: CharKind;

        switch (state) {
            case State.StartSingleLineComment:
            case State.SingleLineComment:
            case State.StartMultiLineComment:
            case State.MultiLineComment:
            case State.EndMultiLineComment:
            case State.StartShebangComment:
            case State.ShebangComment:
                charKind = "comment";
                break;
            case State.SingleQuoteString:
            case State.SingleQuoteStringEscapeBackslash:
            case State.SingleQuoteStringEscapeQuote:
            case State.DoubleQuoteString:
            case State.DoubleQuoteStringEscapeBackslash:
            case State.DoubleQuoteStringEscapeQuote:
            case State.TemplateString:
            case State.TemplateStringEscapeBackslash:
            case State.TemplateStringEscapeQuote:
            case State.StartExpressionHole:
                charKind = "string";
                break;
            case State.Regex:
            case State.RegexEscapeBackslash:
            case State.RegexEscapeSlash:
            case State.RegexEscapeOpenBracket:
            case State.CharClass:
            case State.CharClassEscapeBackslash:
            case State.CharClassEscapeCloseBracket:
                charKind = "regex";
                break;
            default:
                const isWhitespace =
                    ch === code_Space ||
                    ch === code_Tab ||
                    ch === code_NewLine ||
                    ch === code_CarriageReturn ||
                    /^\s$/.test(String.fromCharCode(ch));
                charKind = isWhitespace ? "whitespace" : "code";
                break;
        }

        if (nextStateId !== State.Uninitialized) {
            state = nextStateId;
        }

        isBOF = false;

        return { charKind, wrapLine };
    }

    return { step };
}