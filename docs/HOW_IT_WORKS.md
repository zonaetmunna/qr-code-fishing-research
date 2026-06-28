# How It Works — The Complete Flow, Step by Step

> **Research project:** _An Explainable QR Code Analysis for Detecting Phishing and Malicious URLs Using Machine Learning_

> A plain‑language walkthrough of the **real, working system** — from the moment a user scans a
> QR code to the moment they see "Safe" or "Dangerous." You can read this almost word‑for‑word to
> explain the project. Everything here matches what the system actually does.

---

## The idea, in one line

A QR code is just a **hidden link**. Attackers hide dangerous links inside QR codes — this is
called **"quishing."** A safe QR and a dangerous QR look exactly the same, so you can't tell by
looking. Our system **reads the hidden link, checks it with a machine‑learning model, and tells the
user Safe / Risky / Dangerous — with the reasons — before they open it.**

```
   QR image  ──read──►  the link inside  ──model──►  Safe ✅ / Risky ⚠️ / Dangerous 🔴  (+ why)
```

---

## The complete journey — one scan, start to finish

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

## The model — the "brain"

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

## How the model was trained (in Google Colab)

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

## The backend — the "engine room"

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

## The whole thing in one breath (for a quick telling)

> "A QR code hides a link, and attackers hide dangerous links in them. Our app reads the link out of
> the QR, cleans it, and turns it into numbers. A small Transformer model — trained on about 400,000
> example links — decides if it's benign, phishing, malware, or defacement, and we show the user
> Safe, Risky, or Dangerous with the reasons, before they ever open the link. We run it as a real web
> and phone app on a FastAPI server, and we reach 91% accuracy."
