import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function App() {
  const [questions, setQuestions] = useState([]);
  const [scores, setScores] = useState([]);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [leaderboardError, setLeaderboardError] = useState("");

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
    async function loadQuestions() {
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
  }, [loadScores]);

  function chooseAnswer(questionId, optionIndex) {
    setAnswers((current) => ({
      ...current,
      [questionId]: optionIndex,
    }));
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

    if (questions.some((q) => answers[q.id] === undefined)) {
      setError("Please answer every question before submitting.");
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
      await loadScores();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function playAgain() {
    setName("");
    setAnswers({});
    setResult(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      {/* Floating balloons background */}
      <div className="balloons-layer" aria-hidden="true">
        <span className="balloon">🎈</span>
        <span className="balloon">🎈</span>
        <span className="balloon">🎀</span>
        <span className="balloon">🎈</span>
        <span className="balloon">🎁</span>
        <span className="balloon">🎈</span>
        <span className="balloon">🎀</span>
        <span className="balloon">🎈</span>
        <span className="balloon">🎈</span>
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

        <div className="content-grid">
          <section className="quiz-card">
            {result ? (
              <div className="result-panel">
                <div className="result-emoji" aria-hidden="true">
                  {result.score === result.total ? "🏆" : "🎉"}
                </div>

                <div className="result-party-row" aria-hidden="true">
                  <span>🎈</span>
                  <span>🎊</span>
                  <span>🎁</span>
                  <span>🎊</span>
                  <span>🎈</span>
                </div>

                <p className="eyebrow">🌟 QUIZ COMPLETED 🌟</p>
                <h2>Well done, {result.name}! 🎉</h2>

                <div className="score-circle">
                  <strong>
                    {result.score}/{result.total}
                  </strong>
                  <span>Your score</span>
                </div>

                <p>
                  You scored{" "}
                  {Math.round((result.score / result.total) * 100)}%!
                  🥳 Your result has been saved to the shared leaderboard.
                </p>

                <div className="result-party-row" aria-hidden="true">
                  <span>🍰</span>
                  <span>🎀</span>
                  <span>🎂</span>
                  <span>🎀</span>
                  <span>🍰</span>
                </div>

                <button className="primary-button" onClick={playAgain}>
                  🎈 Take the quiz again 🎈
                </button>
              </div>
            ) : (
              <>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">🎉 LET'S PLAY</p>
                    <h2>Birthday Challenge 🎂</h2>
                  </div>

                  <span className="question-count">
                    🎯 {questions.length} questions
                  </span>
                </div>

                <form onSubmit={submitQuiz}>
                  <label className="field-label" htmlFor="player-name">
                    🎀 Your name
                  </label>

                  <input
                    id="player-name"
                    className="name-input"
                    type="text"
                    placeholder="✨ Enter your name..."
                    value={name}
                    maxLength={40}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />

                  {questions.map((question, questionIndex) => (
                    <fieldset className="question-block" key={question.id}>
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
                                  chooseAnswer(question.id, optionIndex)
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
                    className="primary-button submit-button"
                    type="submit"
                    disabled={submitting || questions.length === 0}
                  >
                    {submitting ? "✨ Submitting..." : "🎉 Submit my answers 🎉"}
                  </button>
                </form>
              </>
            )}
          </section>

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
    </>
  );
}

export default App;
