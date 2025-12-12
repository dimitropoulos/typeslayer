const colors = [
  "red",
  "green",
  "blue",
  "yellow",
  "purple",
  "orange",
  "pink",
  "brown",
  "gray",
  "black",
  "cyan",
  "magenta",
  "lime",
  "teal",
  "indigo",
  "violet",
  "gold",
  "silver",
  "bronze",
  "navy",
] as const;

type Color = (typeof colors)[number];

export type Palette<
  Primary extends Color = Color,
  Secondary extends Color = Color,
> = `${Primary}-${Secondary}`;

export type FullPalette<
  Dark extends Palette = Palette,
  Light extends Palette = Palette,
> = `${Dark}|${Light}`;

export type Z = FullPalette<"red-blue", "yellow-green">;
//          ^?

// @ts-expect-error
export const fullPalette = (lightDarkPalette: FullPalette) => {
  // do stuff
  console.log(lightDarkPalette);
};
