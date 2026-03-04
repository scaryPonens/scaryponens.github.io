# Rebuilding an Old Thesis in Public: ETS, State Machines, and a Bubble Man

![The Bean](assets/sbean.png)
*When your old thesis starts looking suspiciously modern.*

I’ve been re-implementing core ideas from my master’s thesis inside `friendly-rotary-phone`.

Not as nostalgia.

As an experiment in whether old process-first abstractions still hold under modern tooling.

So far? They do.

The current Python implementation includes:

- ETS primitives and temporal structs
- active constraints as extension operations
- class representations as grouped constraint sets
- a struct-generating finite-state machine
- a deterministic transducer that emits symbolic spatial instructions

In short: generate structure in time, then instantiate into form.

That framing feels increasingly relevant in agent-era systems, where correctness is less about one pretty output and more about valid trajectories through constrained state.

---

Our Bubble Man example is intentionally small, but useful:

- `seed_head`
- `grow_torso`
- `attach_limbs`

Each step is constrained. Each transition is explicit. Each emitted action is inspectable.

No vibes. No magic leaps.

Just a process you can reason about.

---

A lot of modern AI workflows still optimize for fluent output.

I’m more interested in reliable evolution.

If a system can’t tell me how it got here, I trust it less.

That’s why this old thesis work keeps feeling new.

#AI #StateMachines #FormalMethods #SystemsDesign #Research
