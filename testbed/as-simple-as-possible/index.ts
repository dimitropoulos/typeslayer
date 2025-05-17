export type Bit = '0' | '1';
export type BitArray = Bit[];
export type BitMatrix = BitArray[];
export type BitMatrix3D = BitMatrix[];

export type Byte = `${Bit}${Bit}${Bit}${Bit}${Bit}${Bit}${Bit}${Bit}`;
export type ByteArray = Byte[];
export type ByteMatrix = ByteArray[];
export type ByteMatrix3D = ByteMatrix[];

export type Mapping<T extends string> = {
  [key in T extends "asdf" ? never : T]: `${T}${Byte}`;
}

export type Thing1 = Mapping<Byte>
export type Thing2 = Mapping<`${Byte}${Byte}`>