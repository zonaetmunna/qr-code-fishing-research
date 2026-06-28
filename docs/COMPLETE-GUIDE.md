# Complete Guide — Everything in One Place

> **Research project:** _An Explainable QR Code Analysis for Detecting Phishing and Malicious URLs Using Machine Learning_

This single document combines all three study resources, in presentation order. Read **Part 1** to tell the full story step by step, **Part 2** to prepare for questions, and **Part 3** to understand the underlying concepts.

## Contents
1. **Part 1 — How It Works:** the complete flow, from scanning a QR code to the final answer.
2. **Part 2 — Viva Questions & Answers:** ~60 likely questions with simple, spoken answers.
3. **Part 3 — Learning Guide:** every ML and system concept, defined and explained.



<br>

---


# Part 1 · How It Works — The Complete System Flow

> A plain‑language walkthrough of the **real, working system** — from the moment a user scans a
> QR code to the moment they see "Safe" or "Dangerous." You can read this almost word‑for‑word to
> explain the project. Everything here matches what the system actually does.

---

### The idea, in one line

A QR code is just a **hidden link**. Attackers hide dangerous links inside QR codes — this is
called **"quishing."** A safe QR and a dangerous QR look exactly the same, so you can't tell by
looking. Our system **reads the hidden link, checks it with a machine‑learning model, and tells the
user Safe / Risky / Dangerous — with the reasons — before they open it.**

```
   QR image  ──read──►  the link inside  ──model──►  Safe ✅ / Risky ⚠️ / Dangerous 🔴  (+ why)
```

---

### The complete journey — one scan, start to finish

I'll tell the whole story here, following a single scan through 12 simple steps. ("We" means our
system doing the work.)

**Step 1 — The user scans.**
In our **web app** (built with Next.js) or **phone app** (built with Expo), the user does one of
three things: takes a photo of the QR with the camera, picks a QR image from the gallery, or pastes
a link directly.

**Step 2 — The app sends it to the backend.**
The app sends the image (or the pasted link) over the internet to our **backend** — the program on a
server that does the real work.

**Step 3 — We check the input.**
We make sure the file is really an image and not too big (limit 5 MB), or that the pasted link
isn't empty. If the input is bad, we stop and send back a clear message.

**Step 4 — We read the link out of the QR.**
Using a tool called **pyzbar** (with **OpenCV** as a backup for tricky photos), we decode the QR
image and pull out the hidden text — usually a web link. *(If the user pasted a link, we skip this
step — we already have the text.)*

**Step 5 — We check what kind of thing the QR holds.**
A QR can hold a website link, Wi‑Fi details, plain text, a phone number, and so on. **Only real web
links** (http / https) go to the phishing check; other kinds are shown safely, and Wi‑Fi passwords
are never saved.

**Step 6 — We run quick rule checks (these become the reasons).**
Before the model, we run fast checks that produce simple warnings — *is it http instead of the
secure https? is the web address just a number (an IP) instead of a name? is the ending suspicious
like `.tk`? does it use the `@` trick?* These become the **reasons** shown to the user. They are
explanations — **the model makes the real decision.**

**Step 7 — We prepare the link for the model.**
We clean the link (lowercase it, remove `https://` and `www.`) and turn it into the **two things
the model reads**:

1. **The link itself, as 200 character‑numbers.** Every letter and symbol becomes a number from a
   fixed table (for example `paypal` → `16, 1, 25, 16, 1, 12`). Every link is made exactly 200
   numbers long (short links are filled out with zeros) so the model always gets the same size.

2. **Four brand‑similarity numbers.** We compare the website's name — the *host*, like `paypa1.com`
   — against our list of **65 real brands** (`paypal.com`, `google.com`, `facebook.com`, `amazon.com`,
   `bkash.com`, …) and answer four questions:
   - **① Is it the real brand?** → `1` if the host *is* a real brand or a real sub‑page of one
     (`paypal.com`, `accounts.google.com`); `0` otherwise.
   - **② How close is it to a real brand?** → a number from `0` to `1`. `0` = an exact brand,
     `0.2` = one letter off (`facebookk.com`), `1.0` = nothing like any brand (`xj9zq.tk`).
   - **③ Is it a near‑miss typo?** → `1` if it's just **one or two letters off** a real brand, like
     `facebookk.com` or `gooogle.com` (classic typosquatting); `0` otherwise.
   - **④ Does it use look‑alike characters?** → `1` if swapping look‑alike characters back to real
     letters turns it into a brand: `paypa1.com` (the digit "1" faking an "l") → `paypal.com`, or
     `g00gle.com` (zeros faking the o's) → `google.com`; `0` otherwise.

   So a safe `google.com` gives `[1, 0, 0, 0]`, while a fake `paypa1.com` gives `[0, 0.2, 1, 1]` —
   the model learns to read those patterns.

**Step 8 — The model decides.**
The **dual‑input model** reads both inputs and gives a score for each of four classes:

```
   benign 0.01  |  phishing 0.99  |  malware 0.00  |  defacement 0.00
```

The highest score is the answer (here, **phishing**), along with a confidence.

**Step 9 — We decide the final answer (Safe, Risky, or Dangerous).**
We take the model's scores and turn them into one simple answer:

```
   • If the link is exactly a known real brand         → Safe  (a safety net)
   • else if the model says benign                     → Safe
   • else (phishing / malware / defacement):
            very confident (over 80%) → Dangerous 🔴   (+ the threat type)
            less sure                 → Risky ⚠️      (+ the threat type)
```

**Step 10 — We save the scan.**
We save the result (the link, the answer, the confidence, the reasons, the time) in our database,
**PostgreSQL** (hosted on Neon), as a history we can look back at.

**Step 11 — We send the answer back.**
We send a short message back to the app with the answer, the confidence, the threat type, and the
list of reasons.

**Step 12 — The app shows the result.**
The app shows the answer in colour — green **Safe**, amber **Risky**, red **Dangerous** — with the
threat type, the confidence, the link we read, and the reasons. **The user decides whether to open
it — the app never opens the link for them.**

```
  USER scans / uploads / pastes
    └─► app sends to backend  (/scan or /scan-url)
          └─► check input
                └─► read the link from the QR        (pyzbar / OpenCV)
                      └─► what's inside the QR?         (only web links continue)
                            └─► quick rule warnings    (the reasons)
                                  └─► prepare 2 inputs  (200 characters + 4 brand numbers)
                                        └─► model gives 4 scores
                                              └─► decide Safe / Risky / Dangerous
                                                    └─► save to the database
                                                          └─► send the answer back
                                                                └─► app shows the result
```

---

### The model — the "brain"

The model is a **dual‑input Transformer** — a deep‑learning model that looks at the link in **two
ways at once** and then combines them:

```
  (1) the link's letters ─► gives each letter meaning ─► spots local clues (Conv1D)
                          ─► looks at the whole link together (self-attention / Transformer)
                          ─► makes one summary                                         ┐
                                                                                       ├─► combine ─► 4 scores
  (2) the 4 brand numbers ─► a small network ─────────────────────────────────────────┘
```

- The **letters part** learns what dangerous links look like in general.
- The **self‑attention (Transformer)** is the clever bit — it can connect far‑apart parts of the
  link, like a brand name at the start and a suspicious ending. It's the same family of technology
  behind modern AI, just much smaller (about **130,000 settings**).
- The **brand‑numbers part** reads the four brand‑similarity numbers from Step 7 (is it the real
  brand? how close? a typo? look‑alike characters?).
- The output is one of four classes: **benign, phishing, malware, defacement.**

> **Honest, important point.** We ran an **ablation study** — we removed the brand‑number part and
> retrained with only the letters. The result was almost the same. So the brand numbers do **not**
> make it more accurate; what really makes it accurate is the **extra training examples** we created.
> The brand numbers are still worth having because they **explain** the answer to the user (e.g.,
> "this is one letter off paypal"). In short: **the examples make it smart; the brand numbers make
> it able to explain itself.**

---

### How the model was trained (in Google Colab)

1. **Build the data** — about **402,684 links** from four sources: a labelled dataset, live scam
   feeds (OpenPhish, URLhaus), top global websites, and university websites.
2. **Add fake‑brand examples** — we created misspelled and look‑alike brand links (and some safe
   links that *look* suspicious) so the model learns the real difference.
3. **Split the data** — into a part it learns from, a part to check on, and a final test part it
   never sees while learning.
4. **Train** the dual‑input model, using tricks (dropout, early stopping) so it learns rather than
   memorizes.
5. **Test** it — accuracy, a confusion matrix, ROC‑AUC, a separate brand test, and the ablation.
6. **Export two files** for the backend (below).

Results: **91.2%** accuracy over four classes, **93%** on the simple safe‑vs‑dangerous decision, a
**0.97 ROC‑AUC**, and about **62 ms** per link.

---

### The backend — the "engine room"

A **FastAPI** (Python) program that loads the model once and waits for requests. It has two main
doors: `/scan` for an uploaded QR image and `/scan-url` for a pasted link.

| Piece | What it does |
|---|---|
| **FastAPI** | the program that receives requests and sends answers |
| **pyzbar + OpenCV** | read the link out of the QR image |
| **the model** | decides Safe / Risky / Dangerous |
| **PostgreSQL (Neon)** | saves every scan as history |
| **Docker + Hugging Face Spaces** | hosts the backend online |
| **Vercel** | hosts the website; the phone app is built with Expo |

**The two trained files** the backend uses:
- **`phishing_url_model.keras`** — the trained model (the "brain").
- **`url_tokenizer.json`** — the "translator": the letter→number table, the class order, and the
  brand list. Both files must come from the same training run, and the backend prepares the link
  exactly as the notebook did — otherwise the predictions would break.

---

### The whole thing in one breath (for a quick telling)

> "A QR code hides a link, and attackers hide dangerous links in them. Our app reads the link out of
> the QR, cleans it, and turns it into numbers. A small Transformer model — trained on about 400,000
> example links — decides if it's benign, phishing, malware, or defacement, and we show the user
> Safe, Risky, or Dangerous with the reasons, before they ever open the link. We run it as a real web
> and phone app on a FastAPI server, and we reach 91% accuracy."


<br>

---


# Part 2 · Viva — All Questions & Answers

> **Our project:** _An Explainable QR Code Analysis for Detecting Phishing and Malicious URLs Using Machine Learning_

Your full defense prep. The answers are written the way you'd **actually say them out loud** —
short, simple, plain words. Where a hard word is needed, it's explained right there.
All answers are **honest and match the report**.

⭐ = the questions most likely to come up and most important to get right.

---

### 1 · The basics

**Q. In one line, what is your project?**
"We built a system that checks the link hidden inside a QR code and tells you if it's safe or
dangerous — before you open it — and it explains why."

**Q. What is 'quishing'?**
"QR + phishing. It's when someone hides a scam or virus link inside a normal-looking QR code,
so you scan it and get taken somewhere dangerous without knowing."

**Q. Why is QR phishing dangerous?**
"Because a QR code is just a picture of a link. A safe one and a dangerous one look exactly
the same, so you can't tell before scanning. And most apps just open the link with no check."

**Q. ⭐ Is this really machine learning?**
"Yes, fully. Machine learning means teaching a computer with lots of examples instead of
writing rules by hand — and that's what we did with about 400,000 links. Ours is deep
learning, which is the most advanced type."

**Q. What is your model called?**
"A dual-input Transformer model. Transformer is the same kind of technology behind modern AI,
just much smaller. 'Dual-input' means it looks at the link in two ways at once."

**Q. How many algorithms did you use?**
"One main model. We trained it in two versions — the full one and a simpler one for a test —
but it's the same algorithm, not many."

**Q. What is deep learning, simply?**
"It's machine learning that uses a 'brain' made of many layers, so it can learn complicated
patterns from raw data by itself."

---

### 2 · The problem & why this approach

**Q. ⭐ Why check the link text, not the QR picture?**
"Because the danger isn't in the picture — it's in the link the picture holds. Trying to spot
danger from the image is weak and roundabout. Reading the actual link is direct, needs less
data, and a person can read it — so we can explain it."

**Q. So you don't use the QR image at all?**
"We only use it to read out the link. After that, everything works on the link text. The
image itself is thrown away."

**Q. Why is your system 'explainable'? Why does that matter?**
"Because it doesn't just say 'dangerous' — it gives reasons, like 'this looks like paypal but
spelled wrong.' That matters because a normal user needs a reason to trust the warning."

---

### 3 · Objectives & related work

**Q. What were your objectives?**
"Two. First, build a new, explainable model to find phishing and malicious links in QR codes.
Second, check how accurate it is compared to existing methods."

**Q. What did past research do, and what was missing?**
"Others built good link-checkers, but mostly for emails and websites, not QR codes — and
mostly just 'safe or unsafe.' The gaps were: very little QR-specific work, mostly two-class
not multi-class, weak explanation, and no test on brands the model had never seen. We filled
those."

**Q. How is your work different from existing QR studies?**
"Most QR studies look at the image and give a yes/no answer. We look at the link text, give
four detailed classes, explain the result, and test on unseen brands."

---

### 4 · The dataset

**Q. How big is your dataset?**
"About 402,684 links."

**Q. Where did the links come from?**
"Four places: a ready-made labelled set; live scam feeds called OpenPhish and URLhaus; a list
of the world's top safe sites; and around 9,000 university websites. Then we added some
fake-brand examples ourselves."

**Q. Why did you make your own fake examples?**
"The real data didn't have enough brand-copy attacks, so we created some — like misspelled
brand names — to teach the model those tricks. This is called augmentation."

**Q. ⭐ What are 'hard negatives'?**
"Safe links that look a bit suspicious on purpose — like `paypal.com/login`. We mark them
safe, so the model learns the real difference instead of panicking at the word 'login.'"

**Q. Was your data balanced?**
"We balanced it by sampling, and for the smallest type — malware — we told the model to pay
extra attention so it wouldn't ignore it."

**Q. How did you split the data?**
"We kept about 41,000 links completely aside as a test set the model never sees while
learning, plus a separate check set. That keeps our final score honest."

**Q. What are your four classes?**
"Benign (safe), phishing (fake login page), malware (virus link), and defacement (hacked
site)."

---

### 5 · Features & preprocessing

**Q. How do you prepare a link before the model sees it?**
"We clean it — lowercase it, remove the `https://` and `www.` — then turn it into a fixed list
of 200 characters the model can read as numbers."

**Q. What are your four 'brand features'?**
"Four signals about how close the link is to a real brand: does it exactly match a brand, how
many letters off is it, is it a near-miss, and does it use look-alike characters."

**Q. What's a homoglyph?**
"A look-alike character swap — like `paypa1` with the number one instead of the letter l, or
`g00gle` with zeros. It looks right at a glance but it's fake."

**Q. How do you measure how close a link is to a brand?**
"With edit distance — how many letters you'd change to make it the real brand. `facebook` to
`facebookk` is one change. Small change means it's probably a copy."

**Q. ⭐ Why must the same code run in training and in the live app?**
"Because if the features were worked out even a little differently when it's live, the answers
would quietly go wrong. So we use the exact same code in both places."

---

### 6 · The model

**Q. Can you walk me through the model simply?**
"The link goes in as numbers. We give each letter a meaning. A small part spots little clues.
Then the Transformer looks at the whole link together. We squeeze it into one summary, and the
last step gives the four percentages."

**Q. What is 'attention' in simple terms?**
"It lets the model look at the whole link at once and connect far-apart parts — like a brand
name at the start and a weird ending — instead of looking at small pieces only."

**Q. Why 'dual-input'?**
"It looks at the link two ways at the same time — one part reads the raw letters, the other
reads the brand signals — then joins them."

**Q. How big is the model?**
"About 130,000 settings. That's tiny for AI, which is why it's fast and easy to retrain."

**Q. What does the Conv1D part do?**
"It spots small local patterns — little chunks like `.tk` or `-login` — before the bigger part
looks at the whole link."

---

### 6.5 · ⭐⭐ Why THIS model and not others? (the #1 question — study this)

**The short answer to say:**
"We picked a light Transformer because it reads the raw link letters directly and can connect
far-apart parts of the link — which older models do less well — while staying small enough to
run anywhere."

**Why not the others, in plain words:**

| Other option | Why not |
|---|---|
| **Logistic Regression / Naive Bayes** | Too simple, and you must hand-feed it features — it can't read the raw link itself. |
| **SVM** | Also needs hand-made features, can't read a sequence of letters, and gets slow on 400,000 links. |
| **Random Forest / XGBoost** | Great for spreadsheet-type data, but they can't understand the order of letters in a link. |
| **Character-CNN** | Only sees small chunks at a time — weak at connecting far-apart parts. |
| **LSTM / GRU (older AI)** | Reads one letter at a time — slower and worse at long-distance links. |
| **BERT / big AI models** | Far too heavy and slow for short links — overkill and hard to host for free. |

**The honest part (say it if pushed):**
"To be fully honest, we didn't run all of those as experiments. Our own test showed even a
simpler version does about the same, so we justify our choice by speed and explainability, not
by beating those models on numbers. We can add a comparison if you'd like the actual figures."

---

### 7 · Training

**Q. How did you train it?**
"We used a standard helper called Adam that adjusts the model to be less wrong, and a loss —
basically a 'how wrong are you' score — to guide it. It practised on the links 15 times over."

**Q. ⭐ How did you stop it from memorizing?**
"Three things: dropout (randomly switching off parts so it can't memorize), early stopping
(quitting once it stops improving), and slowing the learning down near the end. Our training
and check scores stayed close, which means no memorizing."

**Q. What is overfitting?**
"When the model memorizes the practice data instead of really learning, so it does great on
what it has seen but badly on new links. We avoided it."

**Q. How long did training take, and where?**
"A few minutes on a free Google Colab GPU, using TensorFlow."

---

### 8 · Results

**Q. What accuracy did you get?**
"91.2% across the four classes, and 93% on the simple safe-versus-dangerous decision."

**Q. What other numbers should I know?**
"A 0.97 ROC-AUC — that's a score out of 1 for how well it separates safe from dangerous, so
0.97 is very good. It catches 95% of threats, and it answers in about 62 milliseconds."

**Q. ⭐ Is 91% good enough to actually use?**
"On the part that matters for safety — safe versus dangerous — it's 93% and catches 95% of
threats, plus we add a safety net for known brands. It's a strong prototype; turning it into a
full product is future work, so we're not over-claiming."

**Q. Which type is hardest to get right?**
"Telling safe from phishing — and that's on purpose, because we made the data tricky by
putting login-style paths on real, safe sites."

**Q. How do your numbers compare to other research?**
"Others report 95–99%, but on an easier setup. We do four classes instead of two, QR-decoded
links, and an extra unseen-brand test — so it's not a fair side-by-side."

---

### 9 · Generalization & the ablation ⭐ (most important)

**Q. How do you know it didn't just memorize?**
"We tested it on links it had never seen — including fake copies of brands we hid on purpose
during training, like dropbox and reddit — and it still caught them. So it learned the
pattern, not a list."

**Q. ⭐ What did your ablation study show?**
"Ablation just means we removed a part and retrained to see what it was worth. We removed the
brand features and kept only the text part — and the result was almost the same, within a
third of a percent. So the brand features didn't actually make it more accurate."

**Q. ⭐ Then why keep the brand features?**
"Two reasons. First, they're what lets us explain the answer in plain words — 'this looks like
paypal but spelled wrong.' Second, our live safety net for real brands uses the same list. So
the examples make it smart; the brand features make it able to explain itself."

**Q. Isn't a 'no improvement' result a weakness?**
"No — it's an honest, useful finding. It tells us why the system works: the extra examples. And
telling the truth is much stronger than claiming something an examiner could disprove by just
re-running it."

---

### 10 · Explainability

**Q. ⭐ How exactly does it explain a result?**
"With each answer it shows plain reasons — like 'predicted phishing, 99% sure,' 'this exactly
matches a known brand,' or 'suspicious ending.' So the user sees why."

**Q. Did you use SHAP or LIME?**
"No — that's future work. SHAP and LIME are tools that show which features caused a decision.
Right now our explanation is simple rule-based reasons, not those tools. I want to be clear
about that."

---

### 11 · The system & deployment

**Q. How does the model actually run for a user?**
"There's a backend — a program on a server — that loads the model once and waits. The app sends
a QR image, the backend reads the link with a tool called pyzbar, runs the model, and sends
back the answer, saving it in a database."

**Q. What apps did you build?**
"A website with Next.js and a phone app with Expo. Both talk to the same backend, so they
always agree."

**Q. What is the backend built with?**
"FastAPI — a Python tool for building this kind of service."

**Q. Where is everything hosted?**
"The backend runs in a Docker container on Hugging Face Spaces, and the website is on Vercel.
Docker is like a sealed box that makes it run the same anywhere."

**Q. Where do you store the results?**
"In a PostgreSQL database — basically a notebook that saves every scan so we can review it."

**Q. Is it fast and scalable?**
"Yes — about 62 milliseconds per link, so it feels instant. Making it fully production-grade is
listed as future work."

---

### 12 · Limitations & future work

**Q. ⭐ Why does it sometimes flag a real site like paypal.com?**
"Because paypal is copied by scammers so often that even the real name carries a 'scam-ish'
feel the model picks up. In the live system we fix this with a safety net that recognizes real
brands — so it's a model quirk, not a system problem."

**Q. What are the main limitations?**
"A few: those real-brand false alarms (which we patch), some safe-versus-phishing mix-ups, a
smaller malware set, our explanation is simple rules not SHAP/LIME yet, and we only read the
link — we don't open the page itself."

**Q. Could an attacker get past it?**
"Yes — the main way is a perfectly normal-looking link that leads to a bad page. That's exactly
why checking the destination page is on our future-work list."

**Q. What is the most important next step?**
"Reading the destination page as a second check, and adding a proper SHAP/LIME explanation."

---

### 13 · Contribution & novelty

**Q. What's new in your work? Your contribution?**
"Four things: solving QR scams through the link text, not the image; a dual-input model plus an
honest test of what the features really do; four classes instead of two; and an unseen-brand
test that most papers skip."

**Q. ⭐ Did you compare against other algorithms like Random Forest or a CNN?**
"No — we proposed one well-justified model and tested it carefully, instead of running a
contest. If you'd like actual numbers against Random Forest or a CNN, I can add that quickly."

**Q. What would you do differently next time?**
"Add comparison baselines from the start, collect more malware data, and build the SHAP/LIME
explanation into the system instead of leaving it for later."

---

### 14 · Tricky / challenge questions

**Q. Your dataset is mostly safe links — isn't that a problem?**
"We balanced the classes by sampling and used class weighting so the model still pays proper
attention to the rarer scam types."

**Q. What if the scam uses a brand-new web address never seen before?**
"The model judges from the link's text patterns — odd endings, length, structure, brand
look-alikes — not from a list of known bad sites. So it can flag new addresses too."

**Q. Your accuracy (91%) is lower than others (99%). Why is that okay?**
"Because we solve a harder problem — four classes, QR links, and an unseen-brand test. On the
safe-versus-dangerous part that matters most, we reach 93%."

**Q. If the features don't improve accuracy, isn't the model just a normal text classifier?**
"At the accuracy level, yes — the text part does the heavy lifting. The dual-input design earns
its place by making the system explainable, which is one of our main goals."

**Q. Why didn't you use a bigger model like BERT?**
"It would be far too heavy and slow for short links, and hard to host for free. A small model
gives almost the same result and runs instantly."

---

### 15 · About you & your process

**Q. What was your specific role / contribution in the team?**
*(Answer honestly for your own part — e.g., "I worked mainly on the model and the dataset,"
or "I built the backend and the apps.")*

**Q. What was the hardest part?**
"Getting the model to handle brand copycats reliably, and being honest when the ablation showed
the features helped explanation more than accuracy."

**Q. What did you learn from this project?**
"How to build a full machine-learning system end to end — data, model, backend, apps — and the
importance of testing honestly and reporting the real result, even when it's not what you
expected."

---

### 🟢 Golden rules — keep yourself safe in the viva

1. **Be honest about the ablation** → "the examples drive the accuracy; the brand features
   drive the explanation." Never say the features made it more accurate.
2. **Don't claim SHAP/LIME exists** → "simple rule-based reasons; SHAP/LIME is future work."
3. **Don't claim you beat other algorithms** → "we proposed and tested one, didn't run a
   contest." Offer to add a comparison if they ask.
4. **Know these numbers cold:** 402,684 links · 4 classes · ~130,000 settings · 91.2% / 93% ·
   0.97 ROC-AUC · ~62 ms.
5. **If you don't know something, say so** → "I'm not certain, but my understanding is…" is far
   better than guessing and getting caught.
6. **Speak slowly and simply.** You understand this — explain it like you'd explain it to a
   friend.


<br>

---


# Part 3 · Learning Guide — Understand the Concepts

A study guide to the concepts, algorithms, and technologies behind this thesis. Each topic
introduces the **proper academic term**, gives a **precise definition** and **mechanism**,
a small **illustration**, and **how this project applies it**. Read it top to bottom; the
concepts build on one another.

---

### 0 · Conceptual overview

The system performs **supervised text classification**: it decodes the Uniform Resource
Locator (URL) embedded in a QR code and assigns it to one of four classes
(benign, phishing, malware, defacement) using a trained neural network, then maps that class
to a user‑facing risk level (Safe / Risky / Dangerous) accompanied by an explanation.

```
   QR image ──► decode URL ──► encode as features ──► neural classifier ──► class + explanation
```

**Part 1** covers the machine‑learning model. **Part 2** covers the system that serves it.

---

### A worked example (referenced throughout)

To make the pipeline concrete, the malicious URL **`paypa1.com`** (a homoglyph of
`paypal.com`, using the digit *1* for the letter *l*) is traced through every stage:

```
 paypa1.com
   │  ① Tokenization & encoding   → integer sequence  [17, 2, 49, 17, 2, 28, 14, ...]
   │  ② Embedding                 → each token → a learned 64-dimensional vector
   │  ③ Convolution (Conv1D)      → local n-gram features ("pa1" flagged as atypical)
   │  ④ Self-attention            → relates "paypa1" to brand vocabulary globally
   │  ⑤ Brand-similarity features → edit distance 1 from "paypal" → near-miss = 1
   │  ⑥ Global max pooling        → fixed-length sequence representation
   │  ⑦ Softmax classifier        → P(phishing) = 0.98
   └─►  Prediction: phishing (Dangerous, confidence 0.98)
```

---

## PART 1 · The Machine-Learning Model

### 1. Machine learning and deep learning

**Definition.** *Machine learning (ML)* is the construction of algorithms that **learn a
mapping from inputs to outputs from labelled examples (data)** rather than from explicitly
programmed rules. This project uses *supervised learning* — training on inputs paired with
known correct labels.

*Deep learning* is the subfield of ML that uses **artificial neural networks** with multiple
layers, enabling **representation learning** (the model learns its own features from raw
data instead of relying on hand‑crafted ones).

```
   Artificial Intelligence ⊃ Machine Learning ⊃ Deep Learning ⊃ Transformer (this model)
```

**Application.** The model was trained on a labelled corpus of **402,684 URLs** to learn the
distinction between benign and malicious URLs without manually specified rules.

---

### 1.5 Dataset construction and data augmentation

**Definition.** Model performance depends on a **representative training corpus**. This
project constructs a *multi-source dataset* and enriches it with *data augmentation* — the
generation of synthetic training examples to expose the model to under-represented patterns.

**Multi-source corpus (402,684 URLs).** Four complementary sources are merged and deduplicated:

```
   • Labelled benchmark dataset            → all four classes
   • Live threat feeds — OpenPhish, URLhaus → recent, real phishing & malware URLs
   • Cisco Umbrella top-domains list        → diverse legitimate (benign) sites
   • ≈9,000 university domains (.edu/.ac.*)  → additional benign coverage
```

**Data augmentation.** Synthetic adversarial examples are generated for attack patterns scarce
in the raw data:
- *Typosquatting* — minor misspellings of a brand (e.g., `facebookk.com`).
- *Combosquatting* — a brand combined with extra tokens (e.g., `paypal-secure.com`).
- *Homoglyph substitution* — visually confusable characters (e.g., `paypa1.com`).
- *Hard negatives* — genuine brand domains with sensitive-looking paths (e.g.,
  `paypal.com/login`), labelled **benign**, to sharpen the benign/phishing boundary.

**Application.** The augmentation is the **primary driver of robustness to brand
impersonation**, as established by the ablation study (§16).

---

### 2. Tokenization and sequence encoding

**Definition.** *Tokenization* converts text into discrete units (*tokens*). This project
uses **character‑level tokenization**: each character is mapped to a unique integer index.
Inputs are then standardized to a **fixed sequence length** (200) by *padding* shorter
sequences with zeros and *truncating* longer ones.

```
   p   a   y   p   a   1   .   c   o   m
  17   2  49  17   2  28  14   4  16  15 | 0 0 … 0   (zero-padding to length 200)
```

**Application.** The character vocabulary (≈260 symbols) is constructed **exclusively from
the training partition** to prevent *data leakage* into validation and test data.

---

### 3. Embeddings (distributed representations)

**Definition.** An *embedding* is a learned, dense, low‑dimensional vector representation of
a discrete token. The *embedding layer* is a trainable lookup matrix of dimension
*(vocabulary × d)* that maps each token index to a *d*‑dimensional vector; semantically
similar tokens converge to nearby points in the embedding space.

```
   token 'p' (index 17)  →  [ 0.21, −0.47, 0.83, … ]   (d = 64 dimensions)
```

**Application.** A 64‑dimensional embedding transforms the 200‑token sequence into a
*200 × 64* matrix — the model's first learned representation of the URL.

---

### 4. One-dimensional convolution (Conv1D)

**Definition.** A *convolutional layer* applies a learnable filter (*kernel*) that slides
across the sequence, computing localized features through **weight sharing** — the same
filter detects a pattern regardless of its position. In one dimension, this captures **local
n‑gram patterns** in the character sequence.

```
   p a y p a 1 . c o m
   ▓▓▓ → ▓▓▓ → ▓▓▓ → ▓▓▓     (a kernel of width 5 sliding left-to-right)
```

**Application.** The convolutional layer extracts local lexical cues (e.g., `://`, `.tk`,
`-login`) prior to the self‑attention stage.

---

### 5. Self-attention and the Transformer ⭐

**Definition.** The *self‑attention mechanism* allows every position in a sequence to attend
to (weigh the relevance of) every other position, thereby modelling **long‑range
dependencies**. For each token it derives three vectors — a **Query (Q)**, **Key (K)**, and
**Value (V)** — and computes *scaled dot‑product attention*:

```
   Attention(Q, K, V) = softmax( (Q · Kᵀ) / √dₖ ) · V
```

*Multi‑head attention* performs this in several parallel subspaces (*heads*), each learning a
distinct dependency, then concatenates the results. The *Transformer* (Vaswani et al., 2017,
*"Attention Is All You Need"*) is the architecture built upon stacked self‑attention and
feed‑forward sub‑layers.

```
   https://paypal-secure-login.tk
           └──┬──┘            └┬┘
          brand token      atypical TLD
              └──── jointly attended ────┘  → impersonation signal
```

**Application.** The character tower employs **one Transformer encoder block with four
attention heads**, enabling it to relate distant, jointly informative substrings of the URL.

---

### 6. Residual connections and layer normalization

**Definition.** A *residual (skip) connection* adds a sub‑layer's input to its output
(`y = x + f(x)`), mitigating the *vanishing‑gradient problem* and preserving information in
deep networks. *Layer normalization* standardizes activations across the feature dimension
to stabilize and accelerate training.

**Application.** Following standard Transformer design, each sub‑layer (attention and
feed‑forward) is wrapped in an "Add & Norm" operation (residual connection + layer
normalization).

---

### 7. Position-wise feed-forward network

**Definition.** A *feed‑forward (fully connected / dense) layer* applies a learned affine
transformation followed by a non‑linear activation, mixing the information at each position.

**Application.** A two‑layer feed‑forward sub‑block (Dense 128 → Dense 64) processes each
position after attention; dense layers also appear in the brand‑feature tower and the
classification head.

---

### 8. Global max pooling

**Definition.** *Pooling* aggregates a variable‑length set of vectors into a single
fixed‑length vector. *Global max pooling* takes the maximum value of each feature across all
sequence positions, retaining the most salient activation.

```
   200 position vectors  ──(feature-wise maximum)──►  one 64-dimensional vector
```

**Application.** Reduces the *200 × 64* sequence representation to a single 64‑dimensional
summary of the URL.

---

### 9. Softmax activation and multi-class output

**Definition.** The *softmax function* converts a vector of real‑valued scores (*logits*)
into a **probability distribution** (non‑negative, summing to one). The *argmax* of this
distribution is the predicted class; the corresponding probability is the model's
*confidence*.

```
   benign 0.01   phishing 0.98   malware 0.01   defacement 0.00   →  argmax = phishing
```

**Application.** A softmax over four classes yields `[benign, phishing, malware,
defacement]`; the predicted class is mapped to Safe / Risky / Dangerous.

---

### 10. Loss function and optimization

**Definition.**
- A *loss function* quantifies the discrepancy between predictions and true labels. This
  project uses *categorical cross‑entropy*, which penalizes confident incorrect predictions.
- *Backpropagation* computes the gradient of the loss with respect to each parameter.
- *Gradient descent* iteratively updates parameters in the direction that reduces the loss;
  the *Adam* optimizer is an adaptive variant that scales the step size per parameter.

**Application.** Training minimizes sparse categorical cross‑entropy using Adam for up to
15 *epochs* (full passes over the training data) with a batch size of 128.

---

### 11. Overfitting, generalization, and regularization

**Definition.** *Overfitting* occurs when a model fits the training data so closely that it
fails to *generalize* to unseen data. *Regularization* techniques counteract this:
- *Dropout* — randomly deactivates a fraction of units during training, reducing co‑adaptation.
- *Early stopping* — halts training when validation performance ceases to improve.
- *Learning‑rate scheduling* (ReduceLROnPlateau) — reduces the step size when progress stalls.

**Application.** All three are employed; the close agreement between training and validation
curves indicates the model generalizes rather than memorizes.

---

### 12. Class imbalance and class weighting

**Definition.** *Class imbalance* arises when classes are unequally represented, biasing the
classifier toward the majority class. *Class weighting* assigns higher loss weight to
minority‑class errors to counterbalance this.

**Application.** The dataset is balanced by sampling, and class weighting compensates for the
comparatively smaller malware class.

---

### 13. Data partitioning and leakage

**Definition.** The dataset is partitioned into a *training set* (parameter estimation), a
*validation set* (model selection and early stopping), and a *test set* (final, unbiased
evaluation). *Data leakage* — the inadvertent flow of test information into training — must be
prevented to obtain an honest estimate of performance.

**Application.** A held‑out test set of **41,167 URLs** is evaluated once; the vocabulary is
derived solely from the training partition to avoid leakage.

---

### 14. Evaluation metrics

**Definitions.**
- *Accuracy* — proportion of correct predictions.
- *Precision* — TP / (TP + FP); the reliability of positive predictions.
- *Recall (sensitivity)* — TP / (TP + FN); the proportion of true positives detected.
- *F1‑score* — the harmonic mean of precision and recall.
- *Confusion matrix* — a contingency table of true versus predicted classes.
- *ROC curve / AUC* — the receiver operating characteristic plots the true‑positive rate
  against the false‑positive rate across thresholds; the *Area Under the Curve* summarizes
  discriminative ability (1.0 = perfect, 0.5 = chance).

**Application.** Reported results: 91.2% accuracy, 0.95 precision/recall on the threat class,
and a safe‑versus‑threat ROC‑AUC of 0.97.

---

### 14.5 Generalization evaluation

**Definition.** *Generalization* is a model's ability to perform correctly on data it has
never encountered during training. Strong test‑set accuracy alone can be misleading if the
test data resembles the training data too closely, so this project adds a dedicated
generalization assessment.

**Held‑out brand test.** Look‑alike attacks were synthesized from three brands —
**dropbox, reddit, and pickaboo** — that were *deliberately excluded* from the augmentation
process. Correct detection of these unseen impersonations demonstrates that the model learned
the **general pattern** of brand impersonation rather than memorizing specific brand names.

```
   dropbox-login.com · redditt.com · pickab0o.com   (brands NOT seen in training)
        └──────────── correctly flagged as non-benign ────────────┘
```

**Application.** The model correctly flagged the held‑out impersonations, providing evidence
of genuine generalization rather than memorization (a form of overfitting, §11).

---

### 15. Feature engineering: edit distance and homoglyph normalization

**Definition.** *Feature engineering* is the manual construction of informative input
variables.
- *Levenshtein (edit) distance* — the minimum number of single‑character insertions,
  deletions, or substitutions transforming one string into another; a small distance to a
  known brand indicates probable typosquatting.
- *Homoglyph normalization* — mapping visually confusable characters to their canonical forms
  (`0→o`, `1→l`) to reveal impersonation.

```
   paypal  vs  paypa1   →  edit distance = 1   →  near-miss feature = 1
```

**Application.** Four engineered *brand‑similarity features* (exact match, minimum edit
distance, near‑miss, homoglyph) are computed against 65 reference brand domains using the
RapidFuzz library.

---

### 16. The dual-input architecture

**Definition.** A *dual‑input (multi‑input) architecture* processes two distinct
representations through separate sub‑networks (*towers*) whose outputs are *concatenated*
before classification.

```
   character sequence ─► Transformer encoder tower ──┐
                                                      ├─► concatenate ─► dense ─► softmax(4)
   4 brand features   ─► dense feature tower ─────────┘
```

**Application.** This project's model is a **dual‑input Transformer** (≈130,196 parameters).

> **Critical finding (ablation study).** A controlled *ablation* — retraining with the
> brand‑feature tower removed — showed the character‑only model attains comparable accuracy.
> The engineered features therefore contribute principally to **explainability** (providing
> human‑readable signals) rather than to classification accuracy; the *data augmentation* is
> the primary driver of robustness.

---

## PART 2 · The Serving System

### 17. REST API and the FastAPI framework

**Definition.** A *backend* is server‑side software exposing an *Application Programming
Interface (API)*. A *RESTful API* communicates over HTTP using methods such as `GET` and
`POST`, typically exchanging *JSON*. *FastAPI* is a Python web framework for building such
APIs; an *ASGI server* (Uvicorn) executes the application.

**Application.** The model and tokenizer are loaded once at startup. The endpoint `/scan`
accepts an uploaded image and `/scan-url` accepts a URL directly, both under the `/api/v1`
prefix.

### 18. QR decoding (pyzbar / OpenCV)

**Definition.** *QR decoding* extracts the embedded text from a QR‑code image. *pyzbar*
performs the decoding; *OpenCV* (a computer‑vision library) and *Pillow* / *NumPy* handle
image loading and array conversion.

**Application.** Uploaded images are decoded server‑side; only http(s) payloads proceed to
classification.

### 19. Persistence: relational database and ORM

**Definition.** A *relational database* stores data in tables; *PostgreSQL* is the database
management system used (hosted on Neon). An *Object‑Relational Mapper (ORM)* — *SQLAlchemy* —
maps database rows to Python objects, abstracting raw SQL.

**Application.** Each classification outcome is persisted to the `scan_records` table.

### 20. Containerization and deployment

**Definition.** *Containerization* (*Docker*) packages an application with all dependencies
into a portable, reproducible image. *Deployment* makes the application accessible over the
network; the backend runs on *Hugging Face Spaces* and the web client on *Vercel*.

### 21. End-to-end request flow

```
  Client (web / mobile)        Backend (FastAPI)                       Client
  ────────────────────         ──────────────────────                  ──────────
  1. submit QR image  ──────►  2. decode URL (pyzbar)
                               3. normalize + extract features
                               4. classify (dual-input Transformer)
                               5. map to risk level + indicators
                               6. persist to PostgreSQL
                               7. return JSON answer   ──────────────►  8. render result + explanation
                                                              (prior to opening any link)
```

---

### Glossary of key terms

| Term | Definition |
|---|---|
| Supervised learning | Learning a mapping from labelled input–output examples |
| Representation learning | Automatic learning of features from raw data |
| Tokenization | Converting text into discrete units (tokens) |
| Embedding | A learned dense vector representation of a token |
| Convolution | Localized feature extraction via a sliding shared filter |
| Self-attention | Mechanism relating all sequence positions to one another |
| Transformer | An architecture based on stacked self-attention |
| Softmax | Function producing a probability distribution over classes |
| Cross-entropy | Loss measuring divergence between predicted and true distributions |
| Backpropagation | Algorithm computing gradients of the loss w.r.t. parameters |
| Optimizer (Adam) | Adaptive gradient-descent method for parameter updates |
| Overfitting | Failure to generalize beyond the training data |
| Regularization | Techniques (dropout, early stopping) that improve generalization |
| ROC-AUC | Area under the receiver operating characteristic curve |
| Levenshtein distance | Minimum single-character edits between two strings |
| Data augmentation | Generating synthetic training examples to cover scarce patterns |
| Typosquatting | Brand impersonation via a misspelled / look-alike domain |
| Generalization | Performing correctly on data not seen during training |
| Ablation study | Removing a component to isolate its contribution |
| REST API | HTTP-based interface for client–server communication |
| ORM | Object-Relational Mapper (e.g., SQLAlchemy) |
| Containerization | Packaging software with dependencies (Docker) |

---

### Recommended references

- Vaswani, A. et al. (2017). *Attention Is All You Need.* NeurIPS. — the Transformer.
- Kingma, D. P. & Ba, J. (2015). *Adam: A Method for Stochastic Optimization.* ICLR.
- Goodfellow, I., Bengio, Y. & Courville, A. (2016). *Deep Learning.* MIT Press. — foundational text.
- Alammar, J. *The Illustrated Transformer* — accessible visual exposition of self-attention.
