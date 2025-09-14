// src/app/api/lesson-planner/route.ts
import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
    try {
        // **UPDATED: Destructure the new input fields**
        const { subject, grade, week, duration, strand, subStrand, contentStandard } = await req.json();

        if (!subject || !grade || !week || !duration || !strand || !subStrand || !contentStandard) {
            return NextResponse.json({ error: "All lesson parameters are required." }, { status: 400 });
        }

        const systemPrompt = `You are a master curriculum designer for the Ghana Education Service (GES). Your task is to generate a comprehensive, SBC-aligned lesson plan based on the user's inputs.

        **CRITICAL RULES:**
        1.  The output MUST be a SINGLE, VALID JSON object. Do not include any text, markdown, or formatting before or after the JSON.
        2.  The JSON object must follow this EXACT structure with these specific keys:
            - "subject": string
            - "strand": string
            - "subStrand": string
            - "contentStandard": string
            - "learningOutcomes": string (A single string with each outcome starting with a '•' on a new line)
            - "learningIndicators": string (A single string with each indicator starting with a '•' on a new line)
            - "essentialQuestions": string (A single string with each question starting with a '•' on a new line)
            - "pedagogicalStrategies": string (A comma-separated string of strategies, e.g., "Visual Analysis, Collaborative Learning")
            - "teachingLearningResources": string (A single string with each resource starting with a '•' on a new line)
            - "keyNotesOnDifferentiation": string
            - "activities": array of objects, where each object has the keys "phase", "teacherActivity", and "learnerActivity".
        3.  The "activities" array MUST include objects for "Starter Activity", "Introductory Activity", "Main Activity 1", "Main Activity 2", and "Lesson Conclusion".
        4.  All content MUST be tailored to a Ghanaian context for the specified grade level.
        5.  The AI's job is to take the provided curriculum details and creatively generate the Outcomes, Indicators, Questions, Strategies, Resources, and Activities. The AI should NOT change the provided Subject, Strand, Sub-Strand, etc.
        `;

        // **UPDATED: Construct the user prompt from the new inputs**
        const userPrompt = `Generate a lesson plan based on these exact curriculum details:
        - Subject: ${subject}
        - Form/Class: ${grade}
        - Week: ${week}
        - Total Duration: ${duration} minutes
        - Strand: ${strand}
        - Sub-Strand: ${subStrand}
        - Content Standard: ${contentStandard}
        
        Now, based on the above, generate the \`learningOutcomes\`, \`learningIndicators\`, \`essentialQuestions\`, \`pedagogicalStrategies\`, \`teachingLearningResources\`, \`keyNotesOnDifferentiation\`, and the detailed \`activities\` array.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.6,
            response_format: { type: "json_object" },
        });
        
        const responseJsonString = chatCompletion.choices[0]?.message?.content;
        if (!responseJsonString) {
            throw new Error("AI returned an empty response.");
        }
        
        const lessonPlan = JSON.parse(responseJsonString);
        // Add back the user's input for display purposes
        lessonPlan.userInput = { subject, grade, week };

        return NextResponse.json(lessonPlan);

    } catch (error: any) {
        console.error("Error generating lesson plan:", error.message);
        return NextResponse.json({ error: "Failed to generate lesson plan. The AI may be experiencing high load. Please try again." }, { status: 500 });
    }
}