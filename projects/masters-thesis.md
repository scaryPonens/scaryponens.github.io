---
title: "On the role of temporal and spatial representations in light of the ETS formalism (MCS Thesis 2008)"
tldr: Generative AI before it was cool. A formal generative modeling system based on temporal structural processes, with deterministic decoding into spatial representation.
date_started: 2008-05-01
---

# On the role of temporal and spatial representations in light of the ETS formalism

## Abstract

The Evolving Transformation System (ETS) is a class-oriented representational framework that treats objects as processes rather than static things. In ETS, an object is represented as a temporal sequence of structured events called a struct. Unlike traditional mathematical or “spatial” representations, this approach focuses on how something comes into being. Spatial form isn’t discarded — it can be reconstructed — but it’s no longer the starting point.

The goal of this thesis is to demonstrate, through implementation, how ETS structs can be spatially instantiated. To do this, I designed and implemented the core abstract data types, data structures, and algorithms underlying ETS. The class generating system — the mechanism responsible for producing structured instances — is implemented as a finite state machine.

To illustrate the system in practice, I applied these implementations to a set of interacting class generating systems called “Bubble Man.” The structs produced by these systems are then translated into spatial form using finite state transducers and programmable “spheres” (or “bubbles”). Given a struct, each transducer produces a program that is executed by a corresponding bubble, resulting in a spatial realization of the underlying temporal structure.

This work explores what it means to represent objects as histories of transformations rather than fixed geometries, and how spatial structure can emerge from process.

## Download

[Read the full thesis (PDF)](assets/masters-thesis.pdf) or [Have Claude Sonnet 4.6 read it](https://claude.ai/share/b2de6c89-6166-49b9-8eae-4710453635ea) or [Have ChatGPT 5.2 read it](https://chatgpt.com/share/699cffa7-3a40-800b-a0d9-00004c0b5a7d)
