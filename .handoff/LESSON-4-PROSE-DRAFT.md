# Lesson 4 prose - first full draft, 2026-08-25

Drafted from the approved outline, one bullet at a time, then read straight
through for the joins. Figure positions marked so you can see what each
paragraph is standing next to. Task 11 renders this into `kmeans.html` with the
poster markers.

Register target: `PROSE-GUIDE.md`. No em-dash anywhere. `<strong>` for the
terms, never all-caps.

---

## Clusters

k-means splits a cloud of data points into a number of groups you choose in
advance, and gives every point a single whole number saying which group it
landed in. The **k** is that number, the one you pick. Most software calls this
clustering, and k-means is the algorithm people usually mean by the word.

The first three lessons were about shadows in the literal sense: a cloud of
points, a line or a plane, and what survives when you flatten one onto the
other. A cluster label is a shadow too, in the older sense of the word. It
stands in for something you cannot see directly, it may be faithful and it may
not be, and either way it is smaller than the thing it represents. Four
measurements become the number 2, and the number 2 is what you carry forward.

Something real did change from the first three lessons. There you had a
direction to rotate or a line to tilt, and the data pushed back when you got it
wrong. Here you hand the algorithm a number and it hands back exactly that many
groups, whether or not that many groups are there. Nothing in its output tells
those two cases apart.

This is also the first lesson without a formula. Least squares, covariance and
PCA all have closed-form answers, which means you solve and you are done.
k-means instead starts from a guess and improves it, and stops when improving
stops working. That idiom is worth getting used to here, because lesson 5 runs
on it from end to end.

> **Start from zero: the distance between two rows** *(collapsible)*
>
> Two measurements make a point on a flat page, and the distance between two
> such points is the one you would get with a ruler: square the gap in the
> first measurement, square the gap in the second, add them, take the square
> root. Four measurements make a point in four dimensions. You cannot picture
> that, but the arithmetic does not change. Square each of the four gaps, add
> all four, take the square root. Every "nearest" on this page means nearest by
> that number.

> **Start from zero: what it means to improve a guess** *(collapsible)*
>
> Some problems have a formula. You put the numbers in, the answer comes out,
> and there is nothing to iterate. Others you attack by guessing, scoring the
> guess, changing it in a direction that improves the score, and stopping when
> a round of changes stops improving anything. Nothing guarantees the stopping
> point is the best one available. It only guarantees that no single further
> step of the kind you are taking would help.

## One step, twice

The whole method is three instructions. Put k centers down anywhere in the
cloud. Assign every point to whichever center is closest to it, measured with
the ordinary ruler distance extended to as many measurements as you have. Move
every center to the middle of the points that chose it. Then do the last two
again, and keep doing them.

*[FIGURE: kmeans-step]*

Press **Step** to assign every point to its nearest center, then press it again
to move the centers. The button does one half at a time so that you can see
which half you are watching, because the two halves fail in different ways and
the difference matters later on this page.

There is a score underneath, and it is the total squared distance from each
point to its own center. Both halves of the step can only lower it. Reassigning
a point to a nearer center lowers it by definition, and moving a center to the
middle of its own points is the position that makes their squared distances
smallest. Since the score can only go down and cannot go below zero, the
process has to settle. Notice what that argument does not say: it says nothing
about where it settles, and the starting positions are what decide that.

It stops when an assignment pass moves nothing, and that is what convergence
means here. Convergence is a statement about the algorithm, not about your
data. It tells you the algorithm has stopped changing its mind. It does not
tell you the groups it stopped on are there.

## Six starts

The starting centers are picked at random, so the answer is partly random too.
Below are six runs on the same data at the same k, differing in nothing but
where the centers happened to start.

*[FIGURE: restart-roulette]*

The caption counts the answers rather than promising you a number, so it stays
honest when you change the data or the k.

On the generated blobs, five of the six starts land on the same answer and one
lands somewhere much worse: a total of 89.7 against 506.8. That is about one
start in six, which is close to the 15 percent that turns up across sixty
starts.

There is a standard fix, and it is worth knowing by name because you will meet
it as a default setting. **k-means++** seeds the starting centers far apart
from each other instead of at random. Turn it on with the toggle and all six
starts find the same answer.

It is a real improvement rather than a cure. Ask the same generated blobs for
five groups instead of three, with k-means++ on, and sixty starts still produce
40 distinct answers and a 15 percent spread between the best and the worst.

Now switch the dataset to the crescents, two interleaved half-moons. Every
start agrees with every other start to within 0.2 percent, and every start puts
about a quarter of the points in the wrong moon. Those are two separate
measurements of two different things, and the second one is not improved by the
first.

The reason is worth having, because it is a fact about the method rather than
bad luck on this data. A point joins whichever center is nearest, so the
boundary between any two groups is the set of points equally far from both,
which is a straight line. Every group k-means can draw is therefore a region
bounded by straight cuts. A crescent is not such a region, so no arrangement of
centers can produce one.

## How many groups?

You chose k. Nobody handed it to you, and the data did not suggest it. So the
next question is whether the data can be made to tell you what k should have
been.

The usual answer is the elbow method, and it is worth showing because it is
what people actually do. Run k-means at k=1, 2, 3 and so on, plot the total
score against k, and look for the bend where the curve stops falling steeply.

*[FIGURE: elbow]*

The one thing the curve can never do is tell you to stop. The score falls every
time you raise k, all the way out to one cluster per point and a total of zero.
So a low score is not evidence of anything by itself, and the only signal on
offer is a change in the rate of fall.

On the generated blobs there is a real bend, and the figure puts it at k=3,
which is the number of blobs used to make the data.

Switch to the births. The successive drops run 40, 32, 23, 15, 14 and 12
percent, which is a curve easing off gradually with no bend anywhere in it.
Switch to the biometry and the drops fall to 10 percent and then climb back to
21, so that curve does not even fall steadily. The verdict line under the
figure is computed from the curve rather than asserted by me, and on both real
datasets it declines to name a k.

Both of those datasets are continua rather than clumps, which is the honest
reading of a curve with no bend in it.

## The algorithm never saw the dates

The biometry data is 350 simulated growth scans, each with four measurements:
biparietal diameter, head circumference, abdominal circumference and femur
length. Cluster those four numbers, then plot the resulting groups against
gestational age, which was never given to the algorithm.

*[FIGURE: label-vs-truth]*

At k=3 the groups average 22.8, 28.7 and 35.7 weeks. Their ranges overlap
rather than merely sitting next to each other, so this is not three populations
with gaps between them. The cluster labels account for 0.871 of the variation
in gestational age, and pushing k to 5 raises that to 0.941.

What happened is that the groups are recovering gestational age. The algorithm
was given four size measurements and no dates, and it partitioned the scans
almost entirely by how far along they were, because that is what dominates the
spread of all four measurements at once.

Lesson 3 reached the same conclusion about the same data by an unrelated route:
PC1 was gestational age. Two methods that share none of their machinery
agreeing on one answer is what raises it above a curiosity about either method.

There is a catch you should feel here rather than take on trust. This is four
dimensions, so you cannot glance at the figure and check whether the groups are
really there. You are trusting a summary. Lesson 5 is about what happens when
you want to look instead.

## What this lesson refuses to claim

Everything above was the method working as designed. This section is the part
you should be able to argue with.

There is no right k for either real dataset. Both of them are continua, and the
elbow curve says so by having no elbow in it.

The biometry has no clusters. It has a gradient in gestational age, and asking
for three groups slices that gradient into three pieces at cut points chosen by
the arithmetic rather than by anything about fetal growth.

The birth data will not give you small, appropriate and large for gestational
age. Ask it for three groups and it returns groups of 10, 159 and 231, split
mostly on birthweight with heavily overlapping gestational ages, and nothing in
its output says it missed. But the interesting part is why it missed. SGA, AGA
and LGA are lines drawn by people at chosen percentiles. They are not
boundaries between naturally separate populations, and they were not placed
where outcomes change. So k-means is not failing to find those three groups. It
is reporting, correctly, that they were never in the data as groups. They are
thresholds laid over a continuum, and a method that only knows how to find
clumps will never return them.

Convergence is not correctness, which the crescents already showed. The
algorithm stops when it stops changing its mind, and it has no way to tell you
whether the shape it settled on is the shape of your data.

Lesson 2's units trap does not spring here, which is worth saying because it
usually would. Clustering the raw millimetres and clustering the standardized
values agree on 93.7 percent of the labels. Gestational age dominates all four
measurements so completely that any reasonable scaling finds the same slices
through the same gradient.

One last thing, so that lesson 5 does not have to undo an assumption this page
created. Lesson 5 is UMAP, and it does not use k-means. Its first step builds a
k-nearest-neighbour graph, where the k counts neighbours of a point rather than
groups in the data. The two share a letter and nothing else.

---

## Open questions on the draft itself

1. **The "Clusters" heading.** Plain noun phrase, matching "Principal
   components" in lesson 3. It is duller than the section deserves. Say if you
   want it to carry more.

2. **The four-dimension handoff at the end of "The algorithm never saw the
   dates".** I wrote it as a discomfort you should feel rather than a promise
   about lesson 5. Check whether that lands or reads as vague.

3. **Length of the refusal section.** It is now the longest section on the
   page, which follows from your ruling that it is the spine rather than an
   appendix. Confirm you want that weight, since it means the page ends slowly.
