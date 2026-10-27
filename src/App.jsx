import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { API_URL } from "./config";

function App() {
  const [questions, setQuestions] = useState([]);
  const [scores, setScores] = useState([]);
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
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname.replace(/\/$/, "") || "/");
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
  const [leaderboardError, setLeaderboardError] = useState("");
  const [showIncompletePopup, setShowIncompletePopup] = useState(false);

  const isLeaderboardPage = currentPath === "/leaderboard";
  const isResultPage = currentPath === "/result" || (Boolean(result) && currentPath !== "/leaderboard" && currentPath !== "/");
  const isQuizPage = currentPath === "/quiz" && !isResultPage;
  const isWelcomePage = !isLeaderboardPage && !isResultPage && !isQuizPage;

  const loadScores = useCallback(async () => {
    try {
      setLeaderboardError("");

      const response = await fetch(`${API_URL}/scores`);

      if (!response.ok) {
        throw new Error("Could not load leaderboard.");
      }

      setScores(await response.json());
    } catch {
      setLeaderboardError(
        "Could not load scores. Check that the backend is running."
      );
    }
  }, []);

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

      // If user navigates directly to /quiz without entering a name, redirect to welcome
      if (path === "/quiz" && !savedName.trim()) {
        window.history.replaceState({}, "", "/");
        setCurrentPath("/");
        return;
      }

      setCurrentPath(path);
    };

    window.addEventListener("popstate", syncRoute);
    syncRoute();

    async function loadQuestions() {
      const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
      if (currentPath === "/leaderboard") {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/questions`);

        if (!response.ok) {
          throw new Error("Could not load questions.");
        }

        setQuestions(await response.json());
      } catch {
        setError(
          "Could not connect to the quiz server. Please start the backend."
        );
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
    loadScores();

    return () => window.removeEventListener("popstate", syncRoute);
  }, [loadScores]);

  function chooseAnswer(questionId, optionIndex, questionIndex) {
    setAnswers((current) => ({
      ...current,
      [questionId]: optionIndex,
    }));

    // Auto-scroll to the next question after a brief delay for visual touch feedback
    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      if (nextIndex < questions.length) {
        const nextElem = document.getElementById(`question-block-${nextIndex}`);
        if (nextElem) {
          nextElem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        // If it was the final question, scroll smoothly to the submit button
        const submitBtn = document.getElementById("quiz-submit-btn");
        if (submitBtn) {
          submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }, 280);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          answers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not submit your quiz.");
      }

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
    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToLeaderboard() {
    window.history.pushState({}, "", "/leaderboard");
    setCurrentPath("/leaderboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadScores();
  }

  if (loading) {
    return (
      <main className="page-shell">
        <div className="loading-card">
          <span className="loading-emoji" aria-hidden="true">🎂</span>
          Loading your birthday quiz...
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Floating balloons and birthday cakes background layer */}
      <div className="balloons-layer" aria-hidden="true">
        <span className="balloon">🎈</span>
        <span className="balloon balloon-cake">🎂</span>
        <span className="balloon">🎈</span>
        <span className="balloon">🎀</span>
        <span className="balloon balloon-cupcake">🧁</span>
        <span className="balloon">🎈</span>
        <span className="balloon">🎁</span>
        <span className="balloon balloon-cake">🍰</span>
        <span className="balloon">🎈</span>
        <span className="balloon">🎀</span>
        <span className="balloon">🎈</span>
        <span className="balloon balloon-cake">🎂</span>
        <span className="balloon">🎁</span>
      </div>

      {/* Falling confetti background */}
      <div className="confetti-layer" aria-hidden="true">
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
        <span className="confetti"></span>
      </div>

      {/* Sparkle dots background */}
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
          {/* Party decorations on the sides of the hero */}
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

          <span className="eyebrow">🎂 A SPECIAL DAY • A FUN QUIZ 🎂</span>

          <h1>
            Birthday <span>Quiz!</span>
          </h1>

          <p>
            How well do you know birthdays? Take the quiz, test your
            knowledge, and see your name on the leaderboard! 🥳
          </p>

          <div className="hero-decoration" aria-hidden="true">
            <span>🎂</span>{" "}
            <span>🎈</span>{" "}
            <span>🎉</span>{" "}
            <span>🎁</span>{" "}
            <span>🎀</span>{" "}
            <span>🎊</span>{" "}
            <span>🍰</span>
          </div>
        </header>

        {isWelcomePage && (
          <section className="welcome-card">
            <div className="welcome-confetti" aria-hidden="true">🎈 ✨ 🎁 ✨ 🎈</div>
            <div className="welcome-icon" aria-hidden="true">🎂</div>
            <p className="eyebrow">🎀 BEFORE WE BEGIN 🎀</p>
            <h2>What should we call you?</h2>
            <p className="welcome-description">
              Enter your name below to unlock the birthday challenge.
            </p>
            <form className="welcome-form" onSubmit={startQuiz}>
              <div className="name-inputs-grid">
                <div className="name-field-group">
                  <label className="field-label" htmlFor="welcome-first-name">First name</label>
                  <input
                    id="welcome-first-name"
                    className="name-input welcome-name-input"
                    type="text"
                    placeholder="First name..."
                    value={firstName}
                    maxLength={25}
                    onChange={(event) => {
                      setFirstName(event.target.value);
                      if (error) setError("");
                    }}
                    autoComplete="given-name"
                    autoFocus
                    required
                  />
                </div>

                <div className="name-field-group">
                  <label className="field-label" htmlFor="welcome-last-name">Last name</label>
                  <input
                    id="welcome-last-name"
                    className="name-input welcome-name-input"
                    type="text"
                    placeholder="Last name..."
                    value={lastName}
                    maxLength={25}
                    onChange={(event) => {
                      setLastName(event.target.value);
                      if (error) setError("");
                    }}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              {error && <p className="error-message" role="alert">⚠️ {error}</p>}
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
              <div className="section-heading">
                <div>
                  <p className="eyebrow">🎉 LET'S PLAY</p>
                  <h2>Birthday Challenge 🎂</h2>
                </div>

                <span className="question-count">
                  🎯 {Object.keys(answers).length}/{questions.length} answered
                </span>
              </div>

              {/* Mobile Game Progress Bar */}
              <div className="quiz-progress-wrap" aria-label="Quiz progress">
                <div
                  className="quiz-progress-bar"
                  style={{
                    width: `${questions.length ? (Object.keys(answers).length / questions.length) * 100 : 0}%`
                  }}
                />
              </div>

              <form onSubmit={submitQuiz}>
                <p className="player-greeting">🎀 Playing as <strong>{name}</strong></p>

                {questions.map((question, questionIndex) => (
                  <fieldset
                    id={`question-block-${questionIndex}`}
                    className="question-block"
                    key={question.id}
                  >
                    <legend>
                      <span className="question-number">
                        {String(questionIndex + 1).padStart(2, "0")}
                      </span>

                      {question.question}
                    </legend>

                    <div className="options-grid">
                      {question.options.map((option, optionIndex) => {
                        const selected =
                          answers[question.id] === optionIndex;

                        return (
                          <label
                            key={optionIndex}
                            className={`option-card ${
                              selected ? "selected" : ""
                            }`}
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
          <div className="content-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: "800px", margin: "28px auto 0" }}>
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
                <h2>Well done, {result ? result.name : (name || "Player")}! 🎉</h2>

                {result && (
                  <div className="score-circle">
                    <strong>
                      {result.score}/{result.total}
                    </strong>
                    <span>Your score</span>
                  </div>
                )}

                {result && (
                  <p>
                    You scored{" "}
                    {Math.round((result.score / result.total) * 100)}%!
                    🥳 Your result has been saved to the shared leaderboard.
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
                    🎈 Take the quiz again 🎈
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {isLeaderboardPage && (
          <>
            <section className="leaderboard-page-heading">
              <p className="eyebrow">🏆 THE RESULTS ARE IN 🏆</p>
              <h2>Birthday Quiz Leaderboard</h2>
              <p>See the best scores from everyone who has played!</p>
            </section>

            <div
              className="content-grid leaderboard-page-grid"
              style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: "900px", marginLeft: "auto", marginRight: "auto" }}
            >
              <aside className="leaderboard-card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">⭐ TOP PLAYERS</p>
                    <h2>Leaderboard</h2>
                  </div>

                  <span className="trophy-icon" aria-hidden="true">
                    🏆
                  </span>
                </div>

                <p className="leaderboard-description">
                  🎈 The best scores from everyone who has played!
                </p>

                <button
                  className="refresh-button"
                  type="button"
                  onClick={loadScores}
                >
                  ↻ Refresh scores ✨
                </button>

                {leaderboardError && (
                  <p className="error-message" role="alert">
                    {leaderboardError}
                  </p>
                )}

                {!leaderboardError && scores.length === 0 ? (
                  <div className="empty-state">
                    <span aria-hidden="true">🎈</span>
                    <p>No scores yet!</p>
                    <small>🎁 Be the first to complete the quiz!</small>
                  </div>
                ) : (
                  <ol className="leaderboard-list">
                    {scores.map((player, index) => (
                      <li className="leaderboard-row" key={player.id}>
                        <span className="rank">
                          {index === 0
                            ? "🥇"
                            : index === 1
                              ? "🥈"
                              : index === 2
                                ? "🥉"
                                : `#${index + 1}`}
                        </span>

                        <span className="player-info">
                          <strong>{player.name}</strong>
                          <small>
                            {new Date(player.createdAt).toLocaleDateString()}
                          </small>
                        </span>

                        <span className="player-score">
                          {player.score}/{player.total}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}

                <p className="leaderboard-note">
                  🎊 Scores are shared with other visitors to this website.
                </p>
              </aside>
            </div>
          </>
        )}

        <footer className="page-footer">
          Made for a special birthday <span aria-hidden="true">♥</span>
          <div className="footer-party" aria-hidden="true">
            <span>🎂</span>{" "}
            <span>🎈</span>{" "}
            <span>🎁</span>{" "}
            <span>🎉</span>{" "}
            <span>🎀</span>
          </div>
        </footer>
      </main>

      {/* Modal Popup for Incomplete Questions */}
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
            <p className="modal-message">
              Please answer every question before submitting.
            </p>
            <p className="modal-progress-hint">
              You answered <strong>{Object.keys(answers).length}</strong> of <strong>{questions.length}</strong> questions!
            </p>
            <button
              className="primary-button modal-btn"
              type="button"
              autoFocus
              onClick={() => {
                setShowIncompletePopup(false);
                // Scroll to the first unanswered question
                const firstUnanswered = questions.find((q) => answers[q.id] === undefined);
                if (firstUnanswered) {
                  const el = document.getElementsByName(firstUnanswered.id)[0];
                  if (el) {
                    el.closest(".question-block")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
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
