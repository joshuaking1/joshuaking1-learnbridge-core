'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertTriangle, CheckSquare, Lightbulb, BookCopy, Trophy, Award } from 'lucide-react';
import Confetti from 'react-confetti';

type ModuleStage = 'loading' | 'learning' | 'quiz' | 'passed' | 'error';

type ModuleContent = {
    keyConcepts: string[];
    practicalStrategies: { strategy: string; description: string }[];
    reflectionQuiz: { question: string; options: string[] }[];
};

export default function ModulePage() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<ModuleContent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [stage, setStage] = useState<ModuleStage>('loading');
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [score, setScore] = useState(0);
    const [certificateId, setCertificateId] = useState<string | null>(null);

    const title = searchParams.get('title');
    const category = searchParams.get('category');

    useEffect(() => {
        if (!title || !category) {
            setError("Module title or category is missing.");
            setLoading(false);
            setStage('error');
            return;
        }

        const generateContent = async () => {
            try {
                const response = await fetch('/api/pd-coach', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ generationType: 'generate_module', title, category }),
                });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || "Failed to generate module content.");
                }
                const data = await response.json();
                setContent(data);
                setStage('learning');
            } catch (err: any) {
                setError(err.message);
                toast.error("Could not load module.", { description: err.message });
                setStage('error');
            } finally {
                setLoading(false);
            }
        };
        generateContent();
    }, [title, category]);

    const handleStartQuiz = async () => {
        setStage('loading');
        try {
            const response = await fetch('/api/pd-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ generationType: 'generate_quiz', title }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to generate quiz.");
            }
            const data = await response.json();
            setQuizQuestions(data.quizQuestions);
            setStage('quiz');
        } catch (err: any) {
            toast.error("Could not load quiz.", { description: err.message });
            setStage('learning');
        }
    };

    const handleSubmitQuiz = async () => {
        const correctAnswers = quizQuestions.filter((q, i) => q.answer === userAnswers[i]).length;
        const newScore = (correctAnswers / quizQuestions.length) * 100;
        setScore(newScore);
        
        if (newScore >= 80) { // Passing score
            try {
                const response = await fetch('/api/pd-coach', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ generationType: 'record_completion_and_certify', moduleTitle: title }),
                });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || "Failed to record completion.");
                }
                const data = await response.json();
                setCertificateId(data.certificateId);
                setStage('passed');
                toast.success("Congratulations! You passed the module!");
            } catch (err: any) {
                toast.error("Failed to record completion.", { description: err.message });
            }
        } else {
            toast.error("You did not pass. Please review the material and try again.");
        }
    };

    if (loading || stage === 'loading') {
        return <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    if (error || stage === 'error' || !content) {
        return (
            <div className="text-center p-12 bg-red-50 rounded-lg">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold">Failed to Load Module</h2>
                <p>{error}</p>
                <Button asChild className="mt-4"><Link href="/teacher/pd">Back to PD Coach</Link></Button>
            </div>
        );
    }

    if (stage === 'quiz') {
        return (
            <div className="flex flex-col gap-6">
                <Link href="/teacher/pd" className="flex items-center gap-2 text-sm text-gray-600 hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to PD Coach
                </Link>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl flex items-center gap-2">
                            <CheckSquare className="h-8 w-8 text-green-500" />
                            {title} - Assessment Quiz
                        </CardTitle>
                        <CardDescription>Test your understanding with 5 challenging questions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {quizQuestions.map((question, i) => (
                            <div key={i} className="p-4 bg-gray-50 rounded-md">
                                <p className="font-medium mb-3">Question {i + 1}: {question.question}</p>
                                <RadioGroup
                                    value={userAnswers[i] || ''}
                                    onValueChange={(value) => setUserAnswers(prev => ({ ...prev, [i]: value }))}
                                >
                                    {question.options.map((opt: string, j: number) => (
                                        <div key={j} className="flex items-center space-x-2">
                                            <RadioGroupItem value={opt} id={`q${i}-opt${j}`} />
                                            <Label htmlFor={`q${i}-opt${j}`}>{opt}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        ))}
                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStage('learning')}>
                                Back to Learning
                            </Button>
                            <Button 
                                onClick={handleSubmitQuiz}
                                disabled={Object.keys(userAnswers).length !== quizQuestions.length}
                            >
                                Submit Quiz
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (stage === 'passed') {
        return (
            <>
                <Confetti
                    width={typeof window !== 'undefined' ? window.innerWidth : 0}
                    height={typeof window !== 'undefined' ? window.innerHeight : 0}
                    recycle={false}
                    numberOfPieces={200}
                />
                <div className="flex flex-col gap-6">
                    <Link href="/teacher/pd" className="flex items-center gap-2 text-sm text-gray-600 hover:underline">
                        <ArrowLeft className="h-4 w-4" /> Back to PD Coach
                    </Link>
                    <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
                                <Trophy className="h-12 w-12 text-green-600" />
                            </div>
                            <CardTitle className="text-3xl text-green-700">Congratulations!</CardTitle>
                            <CardDescription className="text-lg">
                                You have successfully completed &quot;{title}&quot; with a score of {score.toFixed(1)}%
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <div className="p-4 bg-white rounded-lg border">
                                <Award className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                <h3 className="font-semibold text-lg">Certificate Issued</h3>
                                <p className="text-gray-600">Your professional development certificate has been generated</p>
                            </div>
                            <div className="flex gap-4 justify-center">
                                <Button asChild>
                                    <Link href={`/verify/certificate/${certificateId}`} target="_blank">
                                        View Certificate
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href="/teacher/pd">
                                        Continue Learning
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    // Learning stage (default)
    return (
        <div className="flex flex-col gap-6">
            <Link href="/teacher/pd" className="flex items-center gap-2 text-sm text-gray-600 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to PD Coach
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{title}</CardTitle>
                    <CardDescription>A bite-sized module on {category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <h3 className="flex items-center text-xl font-semibold mb-4">
                            <Lightbulb className="mr-3 h-6 w-6 text-yellow-500" /> Key Concepts
                        </h3>
                        <ul className="list-disc pl-5 space-y-2">
                            {content.keyConcepts.map((concept, i) => <li key={i}>{concept}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h3 className="flex items-center text-xl font-semibold mb-4">
                            <BookCopy className="mr-3 h-6 w-6 text-blue-500" /> Practical Strategies
                        </h3>
                        <Accordion type="single" collapsible className="w-full">
                            {content.practicalStrategies.map((item, i) => (
                                <AccordionItem key={i} value={`item-${i}`}>
                                    <AccordionTrigger>{item.strategy}</AccordionTrigger>
                                    <AccordionContent>{item.description}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                    <div>
                        <h3 className="flex items-center text-xl font-semibold mb-4">
                            <CheckSquare className="mr-3 h-6 w-6 text-green-500" /> Self-Reflection Quiz
                        </h3>
                        <div className="space-y-6">
                            {content.reflectionQuiz.map((quiz, i) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-md">
                                    <p className="font-medium mb-3">{quiz.question}</p>
                                    <RadioGroup>
                                        {quiz.options.map((opt, j) => (
                                            <div key={j} className="flex items-center space-x-2">
                                                <RadioGroupItem value={opt} id={`q${i}-opt${j}`} />
                                                <Label htmlFor={`q${i}-opt${j}`}>{opt}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <Button onClick={handleStartQuiz} className="w-full" size="lg">
                            <CheckSquare className="mr-2 h-5 w-5" />
                            Take Assessment Quiz
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}