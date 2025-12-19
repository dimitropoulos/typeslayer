# TypeSlayer FAQ

## "but I just want to see my code"

here's a reminder from step 4 of the prerequisites in Start

> mindset: after a build, all code is "your code"
>
> the point of a tool like this is to diagnose performance problems... _and it's perfectly possible your project doesn't have any!_ but if there _are_ problems, those problems can come from anywhere in your total build.
>
>so, if you find yourself thinking "but I just want to look at _my types_ not all any of the 3rd party types": consider that when building and/or typechecking your project there literally is no such thing as "3rd party". if you pull in a dependency that has problems.. _now it's your problem, too_. try to think about things holistically.

___

in the context of diagnosing performance problems wanting to filter by "your code" is definitely wrongthink.

if you don't believe me, I won't try to save you from yourself... some TypeSlayer users have skirted around things by adding `skipLibCheck` and/or `skipDefaultLibCheck` to their `tsconfig.json` (or via the corresponding command line flags).

but again, it's your funeral...

think of it this way <small>(I'm from Michigan, so excuse the car analogy)</small>: if you were on a team making the engine for a car, and you were trying to understand the gas mileage of the vehicle, would you go about this by taking a prototype of the car and removing all the seats, doors, and exterior panels? like... because you just make the engine so that's all you need to look at... right? see what I mean?

and, feel free to tell me why I'm wrong, I can take it. I'd actually be curious to hear your thoughts. maybe there is a legit use-case I'm totally missing.

usually people say "well I can't control what's going on in 3rd party dependencies" to which I say: refer to the prior point from the prerequisites about there being no such thing as 3rd party code by the time of typechecking.

but for another thing, you _very much are in **direct** control of it_ unless of course someone is holding you against your will to force dependencies into your project, to which I'd say your priority should be to get out of that abusive relationship.

## why do I see lots of `<anonymous>` everywhere?

although you may not think of them as distinct types, consider something like this:

```typescript
type Colors = ["red","green","blue"];
```

how many types are there? four.

`Colors` is a named tuple, but from the perspective of the compiler there's also three inlined literal string types, `"red"`, `"green"`, and `"blue"`. those types never got names.

you could have given them names. that'd look like this:

```typescript
type Red = "red";
type Green = "green";
type Blue = "blue";
type Colors = [Red, Green, Blue];
```

but you didn't give them names, did you? no. you didn't.

in language parlance, that'd qualify them as an "anonymous types" in the same way that the arrow function in

```typescript
someArray.map(x => x + 1)
```

is also anonymous.

to cheat a bit: when it's a literal value (like a string literal, number literal, boolean literal, etc.), TypeSlayer will, we just show you the literal value _as though it were the name_. unfortunately, this trick doesn't work with template literal types because their display values are not recorded by TypeScript in the trace files - it'd be super sweet if they were though.

but sometimes, try as one might, there's just no material way to "spell" the type in question. it's more common than you might realize, and in those situations all we can do is fallback to showing `<anonymous>` as a placeholder in the TypeSlayer UI.

## what about `tsgo`?

while I hope and expect [TypeScript-Go](https://github.com/microsoft/typescript-go) will have the `--generateTrace` flag (which TypeSlayer requires), it currently does not.

we, here at TypeSlayer Inc., like to think that this flag hadn't yet been prioritized because... well.. it wasn't especially useful or easy to use before. that's like, the whole reason, like, that TypeSlayer was made.. so TypeSlayer's existence gives some much-needed motivation for keeping the flag around (we hope).

so in the meantime, if you're looking for a way to generate trace, **you can still use `tsc` to get the same type relations information whether or not you're already on `tsgo`**.

after all, the trace file reports information about the types in your source code, independent from the compiler used to generate it. it's a representation of the type information in your code, not the compiler that generated it - so it ultimately shouldn't deeply matter if `tsgo` has the flag or not for the near term.

## what about `Svelte` or `Vue`?

TypeSlayer is built on top of the TypeScript compiler, which means it works with any framework or library that uses `tsc` to typecheck can use TypeSlayer.

that said it seems like it requires extra work to be able to directly call `tsc` with the `--generateTrace` flag. that's a prerequisites.

for the case of Vue, there's an option in the `Customize Flags` area of the Setup to use `vue-tsc` instead of regular `tsc`. can't make too many promises about downstream/fractured ecosystem tools like that, but hey maybe it'll work.

as for Svelte, I don't know much about it so how about you tell me what it needs?

## where does TypeSlayer store my data?

Linux: `~/.local/share/typeslayer/`

macOS: `~/Library/Application Support/typeslayer/`

Windows: `%APPDATA%\typeslayer\`

then, from those locations, the outputs are stored in a `./outputs` directory.

## how sensitive is the data in the outputs?

it's about as tame as data can get. if you're worried about your source code being exposed, you can rest easy. the trace files are generated by the TypeScript compiler, which means they contain only information about the types in your code, not the actual code itself.

for that matter, too, all the data is stored in plaintext json so you can easily take a peek and see what exactly is in there

playing devil's advocate: the only even-potentially sensitive information in the trace files is the file paths of your source code files and the names of your types.

so if you're submitting a bug report and worried about getting in trouble with your employer, please ask first. that'd be a mondo bummer if you lost your job over trying to improve type performance, of all things.

## does TypeSlayer track me?

no. TypeSlayer has no network activity whatsoever.

if you're submitting a bug report, we might ask for some of your trace files to help us debug the issue. but that's it.

consider the door always open for the future, though. there's no evil empire here, but it might be useful in the future to implement some very basic "someone somewhere ran it at this time" diagnostics in the future or perhaps even some very very basic crash reporting.

## why does the Type Graph keep moving?

the Type Graph is a thing called a "force directed graph". it's a way of visualizing a graph where the nodes (in this case, your types) are connected by edges (in this case, the relationships between your types) via a physics simulation. the nodes are positioned based on the strength of the connections between them.

the reason it's always moving is that the layout of the nodes is constantly being updated based on the strength of the connections between the nodes. the layout algorithm is designed to minimize the overall energy of the system, which means that the nodes are constantly moving towards a more stable configuration.

eventually, the nodes will settle into a stable configuration (unless you change the filters, which will cause new/different forces to be in play, and thus get everything moving again).

if that makes you wonder: "why can't you just have it start on the stable layout", then consider that it's _a live simulation_, which means that the to display the stable equilibrium state for a given set of filters you'd have to wait for the simulation to run until it reaches a stable state, which could take a while. so while it's equalizing... you might as well just see it in action. and that's exactly what it does.

___

if you want to stop the movement, you can click on the ⏸ (pause) icon in the top right corner of the Type Graph view. this will lock the current layout and prevent the nodes from moving.

you can also hold your spacebar down to pause the movement of the nodes temporarily.

## how is testing a library different?

benchmarking the performance of types is actually quite akin to any other kid of performance testing. if I have a function in my library, let's say, and I want to test that function's performance.. what do I do? how do I do that? well.. I have to call the function. right?

the "meta" of this whole "TypeScript types performance" thing is ultimately thinking about types as functions. for example a type with no generics is sorta like a function with no parameters. a type with one generic is sorta like a function with one parameter. and so on. that's what people mean when they say "type-level programming".

so... to observe the real-world performance of your types, you have to make sure you're actually "calling" them, like a user might.

in the simplest of terms, that could mean making sure that TypeSlayer is being passed the unit tests for your library, since there is where you're actually calling your library's types.

but in more broad terms, **it might be best to test your library by running TypeSlayer on a different real-world project that uses your library.** that way you can ensure you're getting an accurate picture of how your types perform in a real-world scenario (exactly like you would want to do with any other kind of performance testing).

## this is a lot. where do I start?

ask yourself these questions:

### 1. is there _actually_ a problem?

don't walk into any performance or analysis tool with preconceived notions. your goal is the pursuit of data and evidence. granted "my editor is slow" could absolutely be a piece of evidence - but that in itself is not enough. for example maybe it's slow because of an extension. now, if you add "my editor is slow and the CI is also slow and running `tsc` on the command line is slow" then you've got a good start.

do, though, go into this ready to accept the possibility that nothing is wrong (unless you have aforementioned evidence).

### 2. is there an outlier in the Treemap?

the treemap view is a great place to start. if there's one (or a few) rectangles that are _much larger_ than the rest.. that's a great place to start.

make sure you understand, though, that these files may not be the specific files where you need to fix your types. _they might just be the first file to import the file (perhaps many times removed, down the chain)._

### 3. does anything look weird in Perfetto?

yes, flamegraphs (which is the name of the graph Perfetto shows) can be intimidating - but they're such a powerful tool because you can quickly spot abnormalities. let's say you have a bunch of spans (that's the technical terms for all the little boxes) that are roughly equal in size and then there's one big huge one that dominates the rest. you're human (presumably) so use your highly advanced human skill of pattern matching (which, tragically, [JavaScript still doesn't have](https://github.com/tc39/proposal-pattern-matching)).

once you've found a type (it'll show up in `args` under `sourceId` or `targetId`) you can start to investigate by taking that type id number and dropping it into the Search module.

### 4. are there any Award Winners that stand out?

what does "stand out" mean? don't ask yourself "how big is a union that's _too big_" ask yourself "is there a union that's considerably larger than all the rest". that kind of logic goes for all the type metrics and type relation metrics. that's why they all have little red bars underneath - to show you _relative scale_ to other items in that list.

beyond that, look for type-level limits that are being reached in your project that were errors but someone ignored with `@ts-ignore` or `@ts-expect-error`. these are definitely things you want to address, whether or not you're concerned with slowness.

### 5. sometimes, you still gotta RTFM

if you feel lost _conceptually speaking_, you might need to take a few minutes and read through TypeScript's own documentation on performance tracing.

## can I pay you to help me? 💸

not me, Dimitri. I'm happily employed and not taking consulting gigs at the moment.

_HOWEVZ_ - Michigan TypeScript does have a small private program with some (currently 3) extremely excellent TypeScript experts that do consulting for exactly this kind of thing. I can promise they're the best from personal experience because it's their shoulder's that I cry on when I'm fighting with some arcane module resolution problem.

of course, they're not cheap ([see](https://youtu.be/jE53O1PzmNU)), partly because they're literally the best in the world at this stuff (you probably know their names and you definitely know their work) - but I'm happy to connect you (enough people ask that we formed this small group).

if and only if you're extremely interested: hollatcha boy, `dimitropoulos` on the [MiTS Discord](https://discord.michigantypescript.com).

## but I refuse to run postinstall scripts..

well lucky you, because although the `npx typeslayer` command does run a tiny postinstall script - all it does is download the TypeSlayer binary for your platform.

if you don't want to run that script, you can always just run the platform-specific binary directly. you can find the download links for all platforms by [searching `@typeslayer` on npm.](https://www.npmjs.com/search?q=%40typeslayer)

for example you can do `npx @typeslayer/linux-x64` on Linux, `npx @typeslayer/darwin-x64` on Apple Silicon, or `npx @typeslayer/win32-x64` on Windows on Intel.

## why isn't this a CLI tool?

a goal of the project is show intuitive/beautiful interactive visualizations like treemaps and force graphs, inherently not something a terminal can provide.

I don't like CLI tools. I view them as a last resort, at this point in engineering history. if you're someone that stays up late into the night staring at your dotfiles from neovim... I'm happy for you. be happy for me too?

## how do I use this with a monorepo?

down, Lassie. one step at a time.

right now, TypeSlayer is very single-package focused.

that will have to change in the future for the very-simple reason that the people that need this tool the most are often the ones with monorepos.

but for now, please just pick one package in your monorepo to analyze at a time.

when you do, though, don't forget that you can just as easily run `tsc --generateTrace` manually on every package in your monorepo, and then gather all the traces and sort them by file size. it's almost a guarantee that the ones at the top of that list are the ones you most care about anyway.
