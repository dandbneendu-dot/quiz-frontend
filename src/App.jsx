import { useCallback, useEffect, useState } from "react";
import "./App.css";
import API_URL from "./config";

/* ================================================
   Helper Components
   ================================================ */

function AnimatedScore({ value, total }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1400;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <>
      {display}
      <span style={{ opacity: 0.55, fontSize: "0.6em" }}>/{total}</span>
    </>
  );
}

function ConfettiBurst({ active }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }
    const colors = ["#8B1A3A", "#C2185B", "#F5D06E", "#FF6B6B", "#D8B66A", "#E8C779", "#B77A8C"];
    const count = 90;
    const newPieces = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      dx: (Math.random() - 0.5) * 380,
      dy: 320 + Math.random() * 520,
      rot: Math.random() * 1080 - 540,
      color: colors[i % colors.length],
      delay: Math.random() * 0.35,
      duration: 1.5 + Math.random() * 1.1,
      size: 6 + Math.random() * 8,
      round: Math.random() > 0.5,
    }));
    setPieces(newPieces);
    const timer = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(timer);
  }, [active]);

  if (!pieces.length) return null;

  return (
    <div className="confetti-burst" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="burst-piece"
          style={{
            left: `${p.left}%`,
            top: "-5%",
            background: p.color,
            width: p.size,
            height: p.round ? p.size : p.size * 1.4,
            borderRadius: p.round ? "50%" : "2px",
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
            "--rot": `${p.rot}deg`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ================================================
   Main App
   ================================================ */

function App() {
  const [questions, setQuestions] = useState([]);
  const [firstName, setFirstName] = useState(() => {
    const saved = sessionStorage.getItem("birthdayQuizFirstName");
    if (saved) return saved;
    const full = sessionStorage.getItem("birthdayQuizName") || "";
    return full ? full.split(" ")[0] || "" : "";
  });
  const [lastName, setLastName] = useState(() => {
    const saved = sessionStorage.getItem("birthdayQuizLastName");
    if (saved) return saved;
    const full = sessionStorage.getItem("birthdayQuizName") || "";
    const parts = full.split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  });
  const [name, setName] = useState(() => sessionStorage.getItem("birthdayQuizName") || "");
  const [currentPath, setCurrentPath] = useState(
    () => window.location.pathname.replace(/\/$/, "") || "/"
  );
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(() => {
    const savedResult = sessionStorage.getItem("birthdayQuizResult");
    if (savedResult) {
      try {
        return JSON.parse(savedResult);
      } catch {
        sessionStorage.removeItem("birthdayQuizResult");
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showIncompletePopup, setShowIncompletePopup] = useState(false);
  const [showBurst, setShowBurst] = useState(false);

  const isResultPage =
    currentPath === "/result" ||
    (Boolean(result) && currentPath !== "/");
  const isQuizPage = currentPath === "/quiz" && !isResultPage;
  const isWelcomePage = !isResultPage && !isQuizPage;

  // Trigger confetti burst when result page shows
  useEffect(() => {
    if (isResultPage && result) {
      setShowBurst(true);
      const t = setTimeout(() => setShowBurst(false), 3200);
      return () => clearTimeout(t);
    }
  }, [isResultPage, result]);

  useEffect(() => {
    const syncRoute = () => {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      const savedName = sessionStorage.getItem("birthdayQuizName") || "";
      const savedFirst = sessionStorage.getItem("birthdayQuizFirstName") || "";
      const savedLast = sessionStorage.getItem("birthdayQuizLastName") || "";
      const savedResult = sessionStorage.getItem("birthdayQuizResult");

      if (savedName) setName(savedName);
      if (savedFirst) setFirstName(savedFirst);
      if (savedLast) setLastName(savedLast);
      if (savedResult) {
        try {
          setResult(JSON.parse(savedResult));
        } catch {
          sessionStorage.removeItem("birthdayQuizResult");
        }
      }

      if (path === "/quiz" && !savedName.trim()) {
        window.history.replaceState({}, "", "/");
        setCurrentPath("/");
        return;
      }
      // If someone manually types /leaderboard, redirect them to home
      if (path === "/leaderboard") {
        window.history.replaceState({}, "", "/");
        setCurrentPath("/");
        return;
      }
      setCurrentPath(path);
    };

    window.addEventListener("popstate", syncRoute);
    syncRoute();

    async function loadQuestions() {
      try {
        const response = await fetch(`${API_URL}/questions`);
        if (!response.ok) throw new Error("Could not load questions.");
        setQuestions(await response.json());
      } catch {
        setError("Could not connect to the quiz server. Please start the backend.");
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();

    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  function chooseAnswer(questionId, optionIndex, questionIndex) {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      if (nextIndex < questions.length) {
        const nextElem = document.getElementById(`question-block-${nextIndex}`);
        if (nextElem) nextElem.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        const submitBtn = document.getElementById("quiz-submit-btn");
        if (submitBtn) submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 320);
  }

  function startQuiz(event) {
    event.preventDefault();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!cleanFirst) {
      setError("Please enter your first name.");
      return;
    }
    if (!cleanLast) {
      setError("Please enter your last name.");
      return;
    }

    const fullName = `${cleanFirst} ${cleanLast}`.trim();
    if (fullName.length > 40) {
      setError("Your full name must be 40 characters or fewer.");
      return;
    }

    setName(fullName);
    setFirstName(cleanFirst);
    setLastName(cleanLast);
    sessionStorage.setItem("birthdayQuizFirstName", cleanFirst);
    sessionStorage.setItem("birthdayQuizLastName", cleanLast);
    sessionStorage.setItem("birthdayQuizName", fullName);
    if (questions.length > 0) setError("");
    window.history.pushState({}, "", "/quiz");
    setCurrentPath("/quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitQuiz(event) {
    event.preventDefault();
    setError("");
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }
    if (cleanName.length > 40) {
      setError("Your name must be 40 characters or fewer.");
      return;
    }

    const unansweredIndex = questions.findIndex((q) => answers[q.id] === undefined);
    if (unansweredIndex !== -1) {
      setShowIncompletePopup(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, answers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit your quiz.");

      setResult(data.result);
      sessionStorage.setItem("birthdayQuizResult", JSON.stringify(data.result));
      window.history.pushState({}, "", "/result");
      setCurrentPath("/result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function playAgain() {
    setName("");
    setFirstName("");
    setLastName("");
    sessionStorage.removeItem("birthdayQuizName");
    sessionStorage.removeItem("birthdayQuizFirstName");
    sessionStorage.removeItem("birthdayQuizLastName");
    sessionStorage.removeItem("birthdayQuizResult");
    setCurrentPath("/");
    setAnswers({});
    setResult(null);
    setError("");
    setShowIncompletePopup(false);
    setShowBurst(false);
    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- Loading state ---------------- */
  if (loading) {
    return (
      <main className="page-shell loading-page">
        <div className="loading-card loading-party">
          <div className="loading-orbit-container">
            <div className="orbit-ring">
              <div className="orbit-item orbit-1">🎈</div>
              <div className="orbit-item orbit-2">✨</div>
              <div className="orbit-item orbit-3">🎁</div>
              <div className="orbit-item orbit-4">🎉</div>
            </div>
            <div className="loading-center-icon">🎂</div>
          </div>
          <h2 className="loading-text">Baking the birthday quiz...</h2>
          <p className="loading-subtext">Get ready to celebrate! 🎈</p>
          <div className="loading-progress">
            <div className="loading-progress-fill"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Ambient animated blobs */}
      <div className="bg-blobs" aria-hidden="true">
        <span className="bg-blob" />
        <span className="bg-blob" />
        <span className="bg-blob" />
      </div>

      {/* Confetti burst on result */}
      <ConfettiBurst active={showBurst} />

      {/* Floating balloons & gifts (Background Layer) */}
      <div className="balloons-layer" aria-hidden="true">
        <span className="balloon">🎈</span>
        <span className="balloon balloon-cake">🎂</span>
        <span className="balloon">🎁</span>
        <span className="balloon">🎀</span>
        <span className="balloon balloon-cupcake">🧁</span>
        <span className="balloon">🎈</span>
        <span className="balloon">🎁</span>
        <span className="balloon balloon-cake">🍰</span>
        <span className="balloon">🎈</span>
        <span className="balloon">🎀</span>
        <span className="balloon">🎁</span>
        <span className="balloon balloon-cake">🎂</span>
        <span className="balloon">🎈</span>
      </div>

      {/* Falling confetti */}
      <div className="confetti-layer" aria-hidden="true">
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="confetti" />
        ))}
      </div>

      {/* Sparkles */}
      <div className="sparkle-layer" aria-hidden="true">
        <span className="sparkle-dot">✨</span>
        <span className="sparkle-dot">⭐</span>
        <span className="sparkle-dot">✨</span>
        <span className="sparkle-dot">💫</span>
        <span className="sparkle-dot">✨</span>
        <span className="sparkle-dot">⭐</span>
        <span className="sparkle-dot">✨</span>
        <span className="sparkle-dot">💫</span>
      </div>

      <main className="page-shell">
        <header className="hero">
          <div className="hero-party-left" aria-hidden="true">
            <span>🎈</span>
            <span>🎁</span>
            <span>🎊</span>
          </div>
          <div className="hero-party-right" aria-hidden="true">
            <span>🎀</span>
            <span>🎉</span>
            <span>🎈</span>
          </div>

          <span className="eyebrow">THE BIRTHDAY CHALLENGE</span>
          <h1>
            How Well Do <span>You Know Me?</span>
          </h1>
          <p>
            A little fun, a few surprises, and one big question — how well do you really know me?
          </p>
          <div className="hero-decoration" aria-hidden="true">
            <span>✦</span> <span>🎂</span> <span>✦</span>
          </div>
        </header>

        <div className="page-transition" key={currentPath}>
          {isWelcomePage && (
            <section className="welcome-card">
              <div className="welcome-confetti" aria-hidden="true">✦ ✧ ✦</div>
              <div className="welcome-icon" aria-hidden="true">🎂</div>
              <p className="eyebrow">YOUR INVITATION AWAITS</p>
              <h2>Ready to take the challenge?</h2>
              <p className="welcome-description">
                Enter your name and see how well you know me. Let the fun begin!
              </p>
              <form className="welcome-form" onSubmit={startQuiz}>
                <div className="name-inputs-grid">
                  <div className="name-field-group field-group">
                    <input
                      id="welcome-first-name"
                      className="name-input welcome-name-input"
                      type="text"
                      placeholder=" "
                      value={firstName}
                      maxLength={25}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="given-name"
                      autoFocus
                      required
                    />
                    <label className="field-label" htmlFor="welcome-first-name">
                      First name
                    </label>
                  </div>

                  <div className="name-field-group field-group">
                    <input
                      id="welcome-last-name"
                      className="name-input welcome-name-input"
                      type="text"
                      placeholder=" "
                      value={lastName}
                      maxLength={25}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="family-name"
                      required
                    />
                    <label className="field-label" htmlFor="welcome-last-name">
                      Last name
                    </label>
                  </div>
                </div>

                {error && (
                  <p className="error-message" role="alert">
                    ⚠️ {error}
                  </p>
                )}
                <button className="primary-button welcome-start-button" type="submit">
                  Start the Birthday Quiz <span aria-hidden="true">🎉</span>
                </button>
              </form>
              <p className="welcome-footnote">
                ✨ Ready, {firstName.trim() ? `${firstName.trim()}!` : "birthday star?"} Your fun starts here!
              </p>
            </section>
          )}

          {isQuizPage && (
            <div className="content-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
              <section className="quiz-card">
                
                {/* Floating decorations inside the quiz card */}
                <div className="quiz-card-decorations" aria-hidden="true">
                  <span className="inner-decor decor-1">🎈</span>
                  <span className="inner-decor decor-2">🎂</span>
                  <span className="inner-decor decor-3">🎁</span>
                  <span className="inner-decor decor-4">🧁</span>
                </div>

                <div className="section-heading" style={{ position: 'relative', zIndex: 1 }}>
                  <div>
                    <p className="eyebrow">🎉 LET'S PLAY</p>
                    <h2>Birthday Challenge 🎂</h2>
                  </div>
                  <span className="question-count">
                    {questions.length
                      ? Math.round((Object.keys(answers).length / questions.length) * 100)
                      : 0}
                    % complete
                  </span>
                </div>

                <div className="quiz-progress-wrap" aria-label="Quiz progress" style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    className="quiz-progress-bar"
                    style={{
                      width: `${
                        questions.length
                          ? (Object.keys(answers).length / questions.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <form onSubmit={submitQuiz} style={{ position: 'relative', zIndex: 1 }}>
                  <p className="player-greeting">
                    🎀 Playing as <strong>{name}</strong>
                  </p>

                  {questions.map((question, questionIndex) => (
                    <fieldset
                      id={`question-block-${questionIndex}`}
                      className="question-block"
                      key={question.id}
                      style={{ "--q-index": questionIndex }}
                    >
                      <legend>
                        <span className="question-number">
                          {String(questionIndex + 1).padStart(2, "0")}
                        </span>
                        {question.question}
                      </legend>

                      <div className="options-grid">
                        {question.options.map((option, optionIndex) => {
                          const selected = answers[question.id] === optionIndex;
                          return (
                            <label
                              key={optionIndex}
                              className={`option-card ${selected ? "selected" : ""}`}
                              style={{
                                "--opt-index": optionIndex,
                                "--q-index": questionIndex,
                              }}
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={optionIndex}
                                checked={selected}
                                onChange={() =>
                                  chooseAnswer(question.id, optionIndex, questionIndex)
                                }
                              />
                              <span className="option-letter">
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}

                  {error && (
                    <p className="error-message" role="alert">
                      ⚠️ {error}
                    </p>
                  )}

                  <button
                    id="quiz-submit-btn"
                    className="primary-button submit-button"
                    type="submit"
                    disabled={submitting || questions.length === 0}
                  >
                    {submitting ? "✨ Submitting..." : "🎉 Submit my answers 🎉"}
                  </button>
                </form>
              </section>
            </div>
          )}

          {isResultPage && (
            <div
              className="content-grid"
              style={{
                gridTemplateColumns: "minmax(0, 1fr)",
                maxWidth: "800px",
                margin: "28px auto 0",
              }}
            >
              <section className="quiz-card result-screen-card">
                <div className="result-panel">
                  <div className="result-emoji" aria-hidden="true">
                    {result && result.score === result.total ? "🏆" : "🎉"}
                  </div>

                  <div className="result-party-row" aria-hidden="true">
                    <span>🎈</span>
                    <span>🎊</span>
                    <span>🎁</span>
                    <span>🎊</span>
                    <span>🎈</span>
                  </div>

                  <p className="eyebrow">🌟 QUIZ COMPLETED 🌟</p>
                  <h2>
                    Well done, {result ? result.name : name || "Player"}! 🎉
                  </h2>

                  {/* Clean gradient text score (replaces old black circle) */}
                  {result && (
                    <div className="result-score-text">
                      <AnimatedScore value={result.score} total={result.total} />
                    </div>
                  )}

                  {result && (
                    <div className="result-rank-label">
                      <span aria-hidden="true">
                        {result.score / Math.max(result.total, 1) >= 0.9
                          ? "🏆"
                          : result.score / Math.max(result.total, 1) >= 0.7
                          ? "🥳"
                          : result.score / Math.max(result.total, 1) >= 0.5
                          ? "😊"
                          : result.score / Math.max(result.total, 1) >= 0.3
                          ? "👀"
                          : "🎈"}
                      </span>
                      <strong>
                        {result.score / Math.max(result.total, 1) >= 0.9
                          ? "Birthday Expert"
                          : result.score / Math.max(result.total, 1) >= 0.7
                          ? "Great Friend"
                          : result.score / Math.max(result.total, 1) >= 0.5
                          ? "Pretty Good"
                          : result.score / Math.max(result.total, 1) >= 0.3
                          ? "We Need to Talk"
                          : "Getting to Know Me"}
                      </strong>
                    </div>
                  )}

                  {result && (
                    <p>
                      You scored {Math.round((result.score / result.total) * 100)}%! 🥳
                    </p>
                  )}

                  <div className="result-party-row" aria-hidden="true">
                    <span>🍰</span>
                    <span>🎀</span>
                    <span>🎂</span>
                    <span>🎀</span>
                    <span>🍰</span>
                  </div>

                  <div className="result-actions-row">
                    <button className="primary-button" onClick={playAgain}>
                      ↻ Play again
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <footer className="page-footer">
          Made for a special birthday <span aria-hidden="true">♥</span>
          <div className="footer-party" aria-hidden="true">
            <span>🎂</span> <span>🎈</span> <span>🎁</span> <span>🎉</span> <span>🎀</span>
          </div>
        </footer>
      </main>

      {showIncompletePopup && (
        <div className="modal-backdrop" onClick={() => setShowIncompletePopup(false)}>
          <div
            className="modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="incomplete-popup-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-icon" aria-hidden="true">
              🎂 🎈
            </div>
            <h3 id="incomplete-popup-title">Hold on! 🎉</h3>
            <p className="modal-message">Please answer every question before submitting.</p>
            <p className="modal-progress-hint">
              You answered <strong>{Object.keys(answers).length}</strong> of{" "}
              <strong>{questions.length}</strong> questions!
            </p>
            <button
              className="primary-button modal-btn"
              type="button"
              autoFocus
              onClick={() => {
                setShowIncompletePopup(false);
                const firstUnanswered = questions.find(
                  (q) => answers[q.id] === undefined
                );
                if (firstUnanswered) {
                  const el = document.getElementsByName(firstUnanswered.id)[0];
                  if (el)
                    el.closest(".question-block")?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                }
              }}
            >
              Continue Quiz ✨
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;