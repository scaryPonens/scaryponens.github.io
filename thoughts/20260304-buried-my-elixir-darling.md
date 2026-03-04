# I Buried My Elixir Darling (And It Was the Right Call)

![I’m not mad, I’m just disappointed](assets/imnotmad.png)
*Me, staring at another runtime mismatch with a coffee that had gone cold.*

I didn’t switch stacks because I stopped believing in elegant systems.

I switched because I wanted to ship one.

For this thesis reimplementation project (`friendly-rotary-phone`), I started in Elixir with Livebooks. It felt right on paper: state machines, constrained transitions, deterministic transduction. The architecture had poetry.

But then reality showed up wearing steel-toe boots.

Toolchain mismatch. Runtime assumptions. Notebook loading quirks. “Simple” demos that required too much invisible ceremony. Every hour debugging environment friction was an hour not spent on the model itself.

At some point, I had to choose between loyalty and velocity.

I chose velocity.

And here’s the part nobody likes to say out loud: **a good architecture trapped behind recurring setup friction is just expensive taste.**

So we did the hard reset.

- Removed the Elixir scaffolding
- Rebuilt the project as Python + Jupyter
- Used `uv` for deterministic dependency management
- Preserved the conceptual core: ETS structs, constraints, FSM generation, transducer outputs

The model survived.

Only the ceremony died.

---

I still love Elixir. I still think it’s one of the cleanest ways to model concurrent systems.

But for this moment, this project, and this pace: Python gave me oxygen.

Sometimes architecture is about selecting a language.

Sometimes architecture is about selecting what *not* to fight this week.

---

#AI #Engineering #Elixir #Python #DecisionMaking
