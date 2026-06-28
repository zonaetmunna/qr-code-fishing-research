# Viva / Defense — All Possible Questions & Answers

> **Our project:** _An Explainable QR Code Analysis for Detecting Phishing and Malicious URLs Using Machine Learning_

Your full defense prep. The answers are written the way you'd **actually say them out loud** —
short, simple, plain words. Where a hard word is needed, it's explained right there.
All answers are **honest and match the report**.

⭐ = the questions most likely to come up and most important to get right.

---

## 1 · The basics

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

## 2 · The problem & why this approach

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

## 3 · Objectives & related work

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

## 4 · The dataset

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

## 5 · Features & preprocessing

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

## 6 · The model

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

## 6.5 · ⭐⭐ Why THIS model and not others? (the #1 question — study this)

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

## 7 · Training

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

## 8 · Results

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

## 9 · Generalization & the ablation ⭐ (most important)

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

## 10 · Explainability

**Q. ⭐ How exactly does it explain a result?**
"With each answer it shows plain reasons — like 'predicted phishing, 99% sure,' 'this exactly
matches a known brand,' or 'suspicious ending.' So the user sees why."

**Q. Did you use SHAP or LIME?**
"No — that's future work. SHAP and LIME are tools that show which features caused a decision.
Right now our explanation is simple rule-based reasons, not those tools. I want to be clear
about that."

---

## 11 · The system & deployment

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

## 12 · Limitations & future work

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

## 13 · Contribution & novelty

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

## 14 · Tricky / challenge questions

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

## 15 · About you & your process

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

## 🟢 Golden rules — keep yourself safe in the viva

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
