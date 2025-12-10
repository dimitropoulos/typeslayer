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

export type TwoColors<
  A extends Color = Color,
  B extends Color = Color,
> = `${A}-${B}`;
export type FourColors<
  C extends TwoColors = TwoColors,
  D extends TwoColors = TwoColors,
> = `${C}/${D}`;

export type Z = FourColors<"red-blue", "yellow-green">;
//          ^?

// @ts-expect-error
export type Y = FourColors;
