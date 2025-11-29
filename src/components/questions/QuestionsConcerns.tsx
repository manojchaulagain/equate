import React, { useState, useEffect } from "react";
import { MessageCircle, Send, X, AlertCircle, CheckCircle } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, updateDoc, doc } from "firebase/firestore";

declare const __app_id: string;

interface Question {
  id: string;
  userId: string;
  userEmail: string;
  question: string;
  createdAt: Timestamp | any;
  answered?: boolean;
  answer?: string;
  answeredBy?: string;
  answeredAt?: Timestamp | any;
}

interface QuestionsConcernsProps {
  db: any;
  userId: string;
  userEmail: string;
  userRole?: string;
  isActive?: boolean;
}

const QuestionsConcerns: React.FC<QuestionsConcernsProps> = ({ db, userId, userEmail, userRole = "user", isActive = false }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  
  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (!db) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const questionsPath = `artifacts/${appId}/public/data/questions`;
    const questionsRef = collection(db, questionsPath);
    const q = query(questionsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const questionsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Question[];
        setQuestions(questionsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching questions:", err);
        setError("Failed to load questions.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !db) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const questionsPath = `artifacts/${appId}/public/data/questions`;
      const questionsRef = collection(db, questionsPath);

      await addDoc(questionsRef, {
        userId,
        userEmail,
        question: newQuestion.trim(),
        createdAt: Timestamp.now(),
        answered: false,
      });

      setNewQuestion("");
      setError(null);
    } catch (err: any) {
      console.error("Error submitting question:", err);
      setError("Failed to submit question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerSubmit = async (questionId: string) => {
    if (!answerText.trim() || !db) return;

    setError(null);
    setIsSubmittingAnswer(true);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const questionPath = `artifacts/${appId}/public/data/questions/${questionId}`;
      const questionRef = doc(db, questionPath);

      await updateDoc(questionRef, {
        answer: answerText.trim(),
        answered: true,
        answeredBy: userEmail,
        answeredAt: Timestamp.now(),
      });

      setAnswerText("");
      setAnsweringQuestionId(null);
      setError(null);
    } catch (err: any) {
      console.error("Error submitting answer:", err);
      setError("Failed to submit answer. Please try again.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  return (
    <div
      className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
        isActive
          ? "bg-gradient-to-br from-blue-50/95 via-cyan-50/95 to-blue-50/95 border-l-2 border-r-2 border-b-2 border-blue-500/70"
          : "bg-white/90 border border-white/70 border-t-0"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-blue-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-200/50 blur-[80px]" />
      </div>
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <MessageCircle className="text-blue-600" size={24} />
              Questions & Concerns
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
              {isAdmin ? "Answer questions from players or ask your own." : "Ask questions or share concerns. Admins will respond."}
            </p>
          </div>
        </div>

        {/* Submit Question Form */}
        {(!isAdmin || questions.filter(q => !q.answered).length === 0) && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 shadow-md">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Your Question or Concern
          </label>
          <textarea
            value={newQuestion}
            onChange={(e) => {
              setNewQuestion(e.target.value);
              setError(null);
            }}
            placeholder="Type your question or concern here..."
            className="w-full p-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-none min-h-[100px] text-sm"
            disabled={isSubmitting}
            required
          />
          <button
            type="submit"
            disabled={!newQuestion.trim() || isSubmitting}
            className="mt-3 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-2.5 px-6 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:shadow-none transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Question</span>
          </button>
          {error && (
            <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
          )}
        </form>
        )}

        {/* Questions List */}
        {loading ? (
          <div className="text-center p-8">
            <p className="text-slate-600 font-medium">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-blue-50 rounded-2xl border-2 border-dashed border-blue-200">
            <MessageCircle className="mx-auto text-blue-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium">No questions yet. Be the first to ask!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            {questions.map((q) => (
              <div
                key={q.id}
                className={`p-4 sm:p-5 rounded-2xl border-2 shadow-md ${
                  q.answered
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300"
                    : "bg-gradient-to-br from-slate-50 to-blue-50 border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">
                        {q.userEmail}
                      </span>
                      {q.answered && (
                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">
                          Answered
                        </span>
                      )}
                      {!q.answered && isAdmin && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-slate-800 font-medium whitespace-pre-wrap">
                      {q.question}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {q.createdAt && (q.createdAt.toDate ? q.createdAt.toDate().toLocaleString() : (q.createdAt.seconds ? new Date(q.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()))}
                    </p>
                  </div>
                </div>
                {q.answered && q.answer && (
                  <div className="mt-3 pt-3 border-t border-emerald-300">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">Admin Response:</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white/60 p-2 rounded-xl">
                      {q.answer}
                    </p>
                    {q.answeredAt && (
                      <p className="text-xs text-slate-500 mt-2">
                        Answered on {q.answeredAt.toDate ? q.answeredAt.toDate().toLocaleString() : (q.answeredAt.seconds ? new Date(q.answeredAt.seconds * 1000).toLocaleString() : new Date().toLocaleString())}
                      </p>
                    )}
                  </div>
                )}
                {!q.answered && isAdmin && (
                  <div className="mt-3 pt-3 border-t border-orange-300">
                    {answeringQuestionId === q.id ? (
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-700">
                          Your Answer
                        </label>
                        <textarea
                          value={answerText}
                          onChange={(e) => {
                            setAnswerText(e.target.value);
                            setError(null);
                          }}
                          placeholder="Type your answer here..."
                          className="w-full p-3 border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 resize-none min-h-[100px] text-sm"
                          disabled={isSubmittingAnswer}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAnswerSubmit(q.id)}
                            disabled={!answerText.trim() || isSubmittingAnswer}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-2 px-4 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Submit Answer</span>
                          </button>
                          <button
                            onClick={() => {
                              setAnsweringQuestionId(null);
                              setAnswerText("");
                              setError(null);
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200"
                            disabled={isSubmittingAnswer}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAnsweringQuestionId(q.id);
                          setAnswerText("");
                          setError(null);
                        }}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Answer Question</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionsConcerns;

