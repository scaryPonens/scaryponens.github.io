# Why Startups Need Kanban: Think Back Pressure, Not Burnout

*Originally published on [LinkedIn](https://www.linkedin.com/pulse/why-startups-need-kanban-think-back-pressure-burnout-peter-paul-dvrjc/)*

![kanban for startups](assets/kanban.png)

Startups move fast. But speed without control leads to unpredictable outcomes, constant context switching, and eventually burnout 🔥💀. The irony is that developers already understand the problem—just not always how it shows up in team dynamics.

Every developer knows what happens when a message queue gets overwhelmed: the system slows down, crashes, or starts dropping messages. That is why we use **back pressure**.

What if your team had the same protection? It can. It is called **Work In Progress (WIP) limits**, and it is a core part of **Kanban**.

---

## Message Queues and Back Pressure 101

In software systems, queues act as buffers between producers and consumers. If consumers fall behind, the system can respond by:

* Throttling producers
* Buffering messages
* Failing gracefully

This is back pressure. It prevents overload and preserves flow.

Now apply this idea to your team:

* Product minds are the producers
* Developers and reviewers are the consumers
* The Kanban board is the message queue

Too much input without matching capacity creates flow blockages and overload.

---

## Kanban and WIP Limits

Kanban is a flow-based system focused on managing and improving throughput. Unlike Scrum, there are no sprints—just a steady stream of work moving from left to right.

The key constraint is **WIP limits**.

These are explicit caps on how many items can exist in each stage of the workflow. For example:

* A developer can only have two tasks *In Progress*
* The team can only have three stories in *Code Review*
* Product can only have three stories in *Ready*

These limits force focus, expose bottlenecks, and prevent teams from taking on more than they can finish.

---

## The Analogy in Action

![Analogy in Action](assets/analogy_diagram.png)

When consumers fall behind in a queuing system, back pressure kicks in. When teams fall behind, WIP limits do the same thing: they signal that capacity is full and protect the system from overload.

---

## Sidebar: Back Pressure in Scrum?

Back pressure maps cleanly to Kanban because WIP limits are built into the process.

In Scrum, back pressure is more implicit. Teams rely on timeboxing, sprint commitment, and velocity to regulate flow. Without strict discipline, scope creep and mid-sprint work easily bypass that natural throttle.

In practice, Scrum often requires an iron-fisted Scrum Master to enforce boundaries and say “no” when the sprint backlog is full.

Kanban embeds the back pressure mechanism directly into the system. Scrum outsources it to process rigor—and people.

![The Bean](assets/sbean.png)

---

## Why This Matters for Startups

Startups operate with limited resources and finite throughput. Taking on too much work leads to thrashing: nothing finishes, priorities shift mid-stream, and stress skyrockets 🚀.

Kanban provides a lightweight, flexible way to:

* Focus on flow
* Visualize bottlenecks
* Reduce waste from context switching
* Protect teams from burnout

It requires less ceremony, adapts easily to change, and does not require a dedicated Scrum Master 👮.

---

## Tactical Advice

* __Start small__: Apply WIP limits to *In Progress* first
* __Enforce gently__: Treat limits as signals, not blockers
* __Adjust over time__: Tune limits using real data
* __Use metrics__: Track cycle time, throughput, and blocked work
* __Build culture__: Empower developers to say “no” when limits are reached

---

## Conclusion

Kanban is not just for factories or large organizations. It is a developer-native approach that fits how modern teams actually work—especially startups.

When every hour counts and every developer matters, the fastest way forward is to avoid overheating your most valuable system: your team.

Back pressure keeps distributed systems stable. WIP limits do the same for teams.

> You would not run a system without back pressure. Do not run a team without WIP limits.

For deeper practical guidance, *[Agile Project Management with Kanban](https://www.amazon.ca/dp/0735698953?_encoding=UTF8&psc=1&ref=cm_sw_r_ffobk_cp_ud_dp_H0XXBQ1PWB5QJ9VCJKH6&ref_=cm_sw_r_ffobk_cp_ud_dp_H0XXBQ1PWB5QJ9VCJKH6&social_share=cm_sw_r_ffobk_cp_ud_dp_H0XXBQ1PWB5QJ9VCJKH6&bestFormat=true)* by Eric Brechner is a solid next read.
