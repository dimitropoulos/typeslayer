// biome-ignore-all lint: this file is for demonstrating bad things

export type Bit = "0" | "1";
export type BitArray = Bit[];
export type BitMatrix = BitArray[];
export type BitMatrix3D = BitMatrix[];

export type Byte = `${Bit}${Bit}${Bit}${Bit}${Bit}${Bit}${Bit}${Bit}`;
export type ByteArray = Byte[];
export type ByteMatrix = ByteArray[];
export type ByteMatrix3D = ByteMatrix[];

export type Mapping<T extends string> = {
	[key in T extends "asdf" ? never : T]: `${T}${Byte}`;
};

export type Thing1 = Mapping<Byte>;
export type Thing2 = Mapping<`${Byte}${Byte}`>;

export type Boom<T> = T extends any[] ? Boom<T[number]> : Boom<T[]>;
// @ts-expect-error naa naa nuh boo boo
export type Explosion = Boom<number>;
export type UseExplosion = `exploded-${Explosion}`;

export type Sometime = "later" | "sooner";
export type EvenLater = `even-${Sometime}`;
