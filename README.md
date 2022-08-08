# Bipartite Graph QM

<img src="screenshot.jpg" width="512"><br/>

**BigraphQM** is a web-based implementation of a graph-theoretic approach
to quantum mechanics.

In the current version, quantum systems can be modelled by manually building
[bipartite graphs](https://en.wikipedia.org/wiki/Bipartite_graph).
The method for calculating probabilities is based on finding maximal
[cliques](https://en.wikipedia.org/wiki/Clique_%28graph_theory%29)
by using a variant of the
[Bron-Kerbosch algorithm](https://en.wikipedia.org/wiki/Bron–Kerbosch_algorithm).

**Run it: https://met4citizen.github.io/BigraphQM/**

The app uses [@hpcc-js/wasm](https://github.com/hpcc-systems/hpcc-js-wasm) for
rendering graphs and [KaTeX](https://katex.org) for displaying LaTeX notation.
The idea for the model, together with its interpretation, is a spin-off
of my earlier project [Hypergraph](https://github.com/met4citizen/Hypergraph).


## Overview

In physical reality all the possible sequences of interactions happen.
Relative to each other, these sequences can be either consistent or
inconsistent. Only consistent (i.e. *spacelike*) sequences can interact.

In our model, sequences are thought of as maximal paths in a directed
[bipartite graph](https://en.wikipedia.org/wiki/Bipartite_graph).
Whether two paths are consistent or not, depends on the ancestral
relations of their elements.

Consistency is a pairwise property. That is, if $A$ is consistent with both
$B$ and
$C$,
$B$ and
$C$ don't have to be consistent with each other.
This gives the system many of its quantum mechanical properties.

Measurement is the process in which some part (*observer*) interacts
with some other spacelike part (*system*) in a way that resolves all these
second-order inconsistencies. The result is a set of mutually
inconsistent outcomes in each of which every pair is consistent.
In graph theory, these kind of subgraphs are called maximal
[cliques](https://en.wikipedia.org/wiki/Clique_%28graph_theory%29).

There are typically many sequences (*permutations*, *ordered sets*) that
lead to the same maximal clique
(*[image](https://en.wikipedia.org/wiki/Image_%28mathematics%29)*,
*unordered set*). From the observer's point of view, the proportion of all
the sequences that lead to each maximal clique is the probability, or more
precisely the *weight*, of that outcome.


## The Model

#### Basic concepts

Let $G$ be a directed
[bipartite graph](https://en.wikipedia.org/wiki/Bipartite_graph) with parts
tokens $V_{TO}$ and events
$V_{EV}$.

$\displaystyle\qquad G= (V_{TO} \cup V_{EV}, E),$

$\displaystyle\qquad E\subseteq (V_{TO}{\times}V_{EV})\cup (V_{EV}{\times}V_{TO})$

At each new step, the latest set of tokens $L_{TO}$ is connected
to a new set of events that produces the next generation of tokens.

$\displaystyle\qquad L_{TO}=\big\lbrace v \in V_{TO}\mid\mathbf{deg^+} (v)=0 \big\rbrace$

Two tokens are spacelike if and only if their
[lowest common ancestors](https://en.wikipedia.org/wiki/Lowest_common_ancestor)
(LCA) are events. This means that the concept of space $S$
is relative to some observer $X\subset L_{TO}$.

$\displaystyle\qquad S(X)=\big\lbrace v\in L_{TO}\mid\mathbf{lca}(X,v)\subseteq V_{EV}\big\rbrace$

#### Probabilities

Let the [sample space](https://en.wikipedia.org/wiki/Sample_space) $\Omega$
be some subset of the space $S$ relative to an observer
$X$.

$\displaystyle\qquad\Omega\subseteq S(X)$

One way to find all the measurement outcomes $\mathcal{F}$ is to
first enumerate all the sequences of interactions and then take their
images. The problem is that the number of sequences grows factorially and
the algorithm has time complexity $O(n!)$.

Instead we let $\Omega$ induce an undirected graph $G^\prime$ in which
each token's
[neighbourhood](https://en.wikipedia.org/wiki/Neighbourhood_%28graph_theory%29)
$N^\prime (v)$ is the set of all spacelike tokens relative to that token.

$\displaystyle\qquad N^\prime (v) = S(v)\cap \Omega,\quad v\in\Omega$

The outcomes $\mathcal{F}$ are the maximal
[cliques](https://en.wikipedia.org/wiki/Clique_%28graph_theory%29)
of the $G^\prime$. These cliques can also be presented as a clique graph
$K(G^\prime)$ in which every vertex represents a maximal clique and
two vertices are adjacent when they share at least one vertex in common.

Finding all maximal cliques is an NP-complete problem, but solvable
within our sample space sizes. In the app we use a variant of the
[Bron-Kerbosch algorithm](https://en.wikipedia.org/wiki/Bron–Kerbosch_algorithm)
with the worst-case time complexity $O(3^{n\over 3})$ and for
[k-degenerate graphs](https://en.wikipedia.org/wiki/Degeneracy_%28graph_theory%29)
$O(kn3^\frac{k}{3})$.

$\displaystyle\qquad\mathcal{F} = \mathbf{BK}(\varnothing,\Omega,\varnothing)$

```
ALGORITHM BK(R, P, X) IS
    IF P and X are both empty THEN
        report R as a maximal clique
    choose a pivot vertex u in P ⋃ X
    FOR each vertex v in P \ N(u) DO
        BK(R ⋃ {v}, P ⋂ N(v), X ⋂ N(v))
        P := P \ {v}
        X := X ⋃ {v}
```

Let $p_j$ be the proportion of all the consistent interactions leading to
the clique $\mathcal{F_j}\in\mathcal{F}$.
Informally $p_j$ is the probability of the outcome
$\mathcal{F_j}$. However, if we buy into the philosophy that all the consistent
interactions are realized, we should really think of it as a clique weight.

$\displaystyle\qquad p_j={{|\mathcal{F_j}|!}\over{\sum\limits_{k} |\mathcal{F_k}|!}},\quad j\in \lbrace 1,\dots,|\mathcal{F}| \rbrace$

Based on the weights, we can calculate the weight $\lambda_i$ for the
token $v_i\in\Omega$ to be included in some (any) clique.

$\displaystyle\qquad \lambda_i=\sum_{j}\mathbf{1}_\mathcal{F_j}{(v_i)} p_j,\quad i\in\lbrace 1,\dots,|\Omega|\rbrace$


#### Energy & Entropy

Let $E_{free}$ be the system's free energy. Here one interaction is
considered equivalent to one unit of energy.

$\displaystyle\qquad E_{free} = \sum_j |\mathcal{F_j}||\mathcal{F_j}|!$

The observer gets only one sequence at measurement, so the expected energy
$\langle E\rangle$ can be calculated by using the clique weights and sizes.

$\displaystyle\qquad \langle E\rangle = \sum_j p_j|\mathcal{F_j}|$

Using the clique weights we can calculate the
[Shannon entropy](https://en.wikipedia.org/wiki/Entropy_%28information_theory%29)
$H_1$.

$\displaystyle\qquad H_1 = -\sum_j p_j \log p_j$

#### Past Hypothesis

Suppose we start with the
[past hypothesis](https://en.wikipedia.org/wiki/Past_hypothesis)
so that all the tokens in $\Omega$ are mutually consistent. It means that
the system has the lowest entropy and the highest free energy.

$\displaystyle\qquad H_{1,min} = 0,\quad E_{max} = |\Omega| |\Omega|!$

If the system interacts only with itself, it tends to become more
inconsistent over time. This means that it seems to be compatible with the
[second law of thermodynamics](https://en.wikipedia.org/wiki/Second_law_of_thermodynamics).

Furthermore, since each interaction decreases the average size of
the cliques, and thus the probability for that specific branch,
[the principle of least action](https://en.wikipedia.org/wiki/Stationary-action_principle)
applies and determines the most likely path.

Eventually the system will reach its highest entropy state with the
lowest free energy.

$\displaystyle\qquad H_{1,max} = - \log \frac{1}{|\Omega|},\quad E_{min} = |\Omega|$

#### Entanglement

Let $D_{A,B}$ be the overlap between two cliques.

$\displaystyle\qquad D_{A,B} = {{2|A\cap B|}\over{|A|+|B|}}$

We can extend this measure to all combinations.

$\displaystyle\qquad D = {{\sum 2|A\cap B|}\over{\sum(|A|+|B|)}},\quad \{A,B\}\in\binom{\mathcal{F}}{2}$

If $D=0$, none of the outcomes overlap.
If $D=1$, all the outcomes are the same.
Note that the measure is not defined with only one outcome.


#### Density matrix

The pure quantum state of each clique can be presented as a linear combination
of orthonormal vectors $|\phi_i\rangle$ representing the tokens
$v_i\in\Omega$. The square root left to the sum is the
[normalizing constant](https://en.wikipedia.org/wiki/Normalizing_constant).

$\displaystyle\qquad |\psi_j\rangle = \frac{1}{\sqrt{|\mathcal{F_j}|}}\sum_{i=1}^{n}\mathbf{1}_\mathcal{F_j}{(v_i)}|\phi_i\rangle$

The [density matrix](https://en.wikipedia.org/wiki/Density_matrix) $\rho$
is the weighted sum of the outer products of the pure states.

$\displaystyle\qquad \rho=\sum_{j=1}^{m} p_j|\psi_j\rangle\langle\psi_j|$

Note that the density matrix, as it is described here, is a limited
projection and unable to represent the detailed ancestral structure.
The bipartite graph is the actual data structure of the model.

#### Phases

Based the overlap of two cliques $D_{A,B}$ we can calculate their
relative phase $\theta_{A,B}$ in radians.

$\displaystyle\qquad \theta_{A,B} = (1 - D_{A,B})\frac{\pi}{2}$


#### Computational Basis

From the observer's point of view all the tokens are identical. It means
that they can't distinguish between two local cliques with the same number
of tokens. At measurement they can, however, distinguish the number of
interactions (i.e. energy), which is proportional to the size of the clique.

So, in order to create a two-state system that the observer can use for
computation, we can define a [qubit](https://en.wikipedia.org/wiki/Qubit)
so that $|0\rangle$ represents cliques of size one (ground state) and
$|1\rangle$ cliques of size two (first excited state). This scheme
generalises to d-state system i.e. *qudits*.


## The Editor

The bipartite graph on the app describes one possible set of consistent
sequences relative to the observer. It doesn't follow sequences that have
become inconsistent with the observer, because the two parts can't interact
with each other.

To ensure consistency, **the editor only allows new edges between spacelike
elements**.

SYMBOL| DESCRIPTION
:-: | :--
![](https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/symboltoken.svg)<br/><sup>TOKEN</sup> | Tokens are abstract elements. The value inside the symbol represent the weight $\lambda\in [0,1]$ of the token. Informally it is the probability that the token would end up being a part of some (any) classical state at (hypothetical) measurement.
![](https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/symbolevent.svg)<br/><sup>EVENT</sup> | Events use tokens as input and produce tokens as output.
![](https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/symboledge.svg)<br/><sup>EDGE</sup> | Directed edges represent input/output relations between tokens and events. Only consistent (i.e. spacelike) connections are allowed.
![](https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/symbolobs.svg)<br/><sup>OBSERVER</sup> | Observer represents a classical system relative to which probabilities are calculated. The observer, too, is a bipartite subgraph, but instead of showing individual tokens and events, they are grouped together for simplicity.
![](https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/symbolenv.svg)<br/><sup>ENVIRONMENT</sup> | Environment is a classical system that can interfere with the sample space.
![](https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/symbolprob.svg)<br/><sup>CLIQUE</sup> | Maximal clique in probability space represents one possible classical outcome. The value inside the symbol is the probability for the observer to see that outcome at (hypothetical) measurement.

User Actions / Shortcuts:

- Click on a token/event/clique to select it. Remove all the selections by
clicking on the background.
- Double click on a token/event to add a new branch.
- Drag a token/event on top of another event/token to connect the two with an
edge. Note: Only consistent (*spacelike*) connections are allowed.
- Drag a token to an empty space before or after another token to reorder the
tokens.
- Click on an edge to select it.
- Double click on an edge to delete it.

TOOL| DESCRIPTION
:-: | :--
<nobr>![](img/undo.svg)![](img/redo.svg)</nobr><br/><sup>UNDO</sup> | Undo/redo operations. The maximum size of the undo buffer is 50 operations. The app also uses localStorage to store the current graph so that if you refresh the page without any URL parameters, you can restore the previous working model.
<nobr>![](img/zoomin.svg)![](img/zoomout.svg)</nobr><br/><sup>ZOOM</sup> | Zoom the graph. If you want to increase/decrease the font size, zoom the browser window first and scale your graph to fit the screen using these zoom buttons.
<nobr>![](img/dectime.svg)![](img/inctime.svg)</nobr><br/><sup>TIME</sup> | Decrease/increase time steps. When a new time step is added, new branches are added to the existing spacelike tokens. By decreasing the time steps you can go back all the way to the initial state.
![](img/addbranch.svg)<br/><sup>ADD</sup> | Add a new branch to the selected token/event. The new branch is automatically extended to the bottom of the graph.
![](img/del.svg)<br/><sup>DEL</sup> | Delete the selected token/event/edge together with all its parents and children that are dependent on it.
![](img/obs.svg)<br/><sup>MEASURE</sup> | Shortcut for making a random proto-measurement.
![](img/env.svg)<br/><sup>DECOHERE</sup> | Shortcut for adding random decoherence to the system.
<b>B C</b><br/><sup>VIEW</sup> | Switch to an alternative view: B) Maximal cliques (classical states) and their probabilities, C) the final state with the induced graph G' and its clique graph K(G'). Note: While an alternative view is shown the editing mode is disabled.
![](img/info.svg)<br/><sup>INFO</sup> | Show the sidebar with details. The details include information about the selected tokens, probabilities, direct URL link to the graph, and the DOT source describing the shown graph. Refer to [The Model](#the-model) for an explanation of the presented mathematical concepts.
![](img/url.svg)<br/><sup>URL</sup> | Copy URL to clipboard. Parameter `g` includes the Base64 encoded bipartite graph.
![](img/svg.svg)<br/><sup>SVG</sup> | Download the shown bipartite graph as a SVG file.
![](img/github.svg)<br/><sup>GitHub</sup> | Link to the GitHub project.


## Gallery

MODEL| DESCRIPTION
:-: | :--
<nobr>**Wave function collapse**</nobr><br/><img src="https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/gallery-collapse.svg" width=700/><br/>[Open in App](https://met4citizen.github.io/BigraphQM/?g=GiKSGgQECBIGgQIECBGwQIECB)|All events are local by definition. However, new edges can add shortcuts through the graph's ancestral structure and break some existing spacelike relations. These instantaneous and non-local effects are known as the [wave function collapse](https://en.wikipedia.org/wiki/Wave_function_collapse).
<nobr>**Bell state (entanglement)**</nobr><br/><img src="https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/gallery-bellstate.svg" width=700/><br/>[Open in App](https://met4citizen.github.io/BigraphQM/?g=DiIkSIkIQjQiEQjQDMGJAjQECIBAg)|[Bell state](https://en.wikipedia.org/wiki/Bell_state) is an example of a maximally [entangled state](https://en.wikipedia.org/wiki/Quantum_entanglement). Here we start with two sequences $A$ and $B$. They both split into two inconsistent (orthogonal) branches. Lets call them <nobr>\|&uarr;></nobr> and <nobr>\|&darr;></nobr>. These branches get entangled so that the observer can only see either <nobr>\|&uarr;&darr;></nobr> or <nobr>\|&darr;&uarr;></nobr>, but never <nobr>\|&uarr;&uarr;></nobr> or <nobr>\|&darr;&darr;></nobr>.
**Decoherence**<br/><img src="https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/gallery-decoherence.svg" width=700/><br/>[Open in App](https://met4citizen.github.io/BigraphQM/?g=DiI8SSRHgISIkKDAjwEBAQEBAQ)|[Decoherence](https://en.wikipedia.org/wiki/Quantum_decoherence) is a process in which the system interacts with its environment so that the overlap decreases and the states become separable.
**Interference**<br/><img src="https://raw.githubusercontent.com/met4citizen/BigraphQM/8986cdd6802723d6662111ef943479f5b3eed3f7/img/gallery-interference.svg" width=700/><br/>[Open in App](https://met4citizen.github.io/BigraphQM/?g=DiI8SSRHgCAigkCAjwBARAQRAR4AgIgIAgI8AQEQMAQEeAICMCAYCPAEBGBAEBHgICAgICAjwEBAQEBAQ)|Two spacelike parts of the sample space can interact and thus [interfere](https://en.wikipedia.org/wiki/Wave_interference) with each other. This changes the probabilities over time and disturbs the [probability wave](https://en.wikipedia.org/wiki/Wave_function). This can be seen at measurement as an interference pattern. - Note: The shown example is the result of random interactions.


## Notes and Acknowledgements

- The idea that every possible outcome is realised is based on
[Many-Worlds Interpretation](https://en.wikipedia.org/wiki/Many-worlds_interpretation).
- The terminology of consistent and inconsistent sequences is taken from
[Consistent Histories](https://en.wikipedia.org/wiki/Consistent_histories).
- The idea that all the facts/outcomes are relative comes from Carlo Rovelli's
[Relational Quantum Mechanics](https://en.wikipedia.org/wiki/Relational_quantum_mechanics).
- The graph-based approach is heavily influenced by the
[Wolfram Model](https://www.wolframphysics.org) and Max Piskunov's work on
Local Multiway Systems ([SetReplace](https://github.com/maxitg/SetReplace)).
- Several parts of the code are from my earlier project
[Hypergraph](https://github.com/met4citizen/Hypergraph).
- Many of the ideas were originally discussed with Tuomas Sorakivi.

----

## Appendix A: The Born Rule

The [Born rule](https://en.wikipedia.org/wiki/Born_rule) is often considered
a key postulate of quantum mechanics. It says that the absolute value of the
vectors inner product, or equivalently the cosine squared of the angle
between the lines the vectors span, corresponds to the transition probability.

The reason why the cosines are squared in the Born rule is geometric.
First, Kolmogorov's axioms tell us that the probabilities should add up to one.
Second, as shown below, the sum of cosines squared equals to one in
high dimensional vector spaces:

Let $r$ be the length of a hypervector in
$n$ dimensional space.

$\displaystyle\qquad r =\sqrt{x_1^2+x_2^2+\dots+x_n^2} \qquad \Bigg| \cdot ()^2 \quad \Bigg| \cdot {1 \over {r^2}}$

$\displaystyle\qquad 1 = \left({{x_1} \over r}\right)^2+\left({{x_2} \over r}\right)^2 + \dots + \left({{x_n} \over r}\right)^2$

$\displaystyle\qquad 1 = cos^2 \theta_1 + cos^2 \theta_2 + \dots + cos^2 \theta_n \quad\square$

This works both ways. So, if we want to move from classical probabilities to
quantum probabilities - that is, from sets to vector spaces - we need to take
square roots to get the probability amplitudes.
