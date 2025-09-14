import Groq from 'groq-sdk';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const getAssessmentPrompt = (topic: string, grade: string, type: string, dok: string, count: number, refinement: string) => `
You are an expert assessment designer for the Ghanaian SBC for grade level: ${grade}.
Your task is to generate exactly ${count} assessment items for the topic "${topic}".
The items must match the assessment type "${type}" and cognitive level DoK ${dok}.

${refinement ? `**CRITICAL REFINEMENT INSTRUCTION:** The user has provided the following feedback on a previous version. Adhere to it strictly: "${refinement}"` : ''}

CRITICAL OUTPUT FORMAT REQUIREMENTS:
1. Return ONLY a JSON array of objects. Do not wrap it in any parent object.
2. Do not include any text before or after the JSON array.
3. The JSON array should start with [ and end with ].

ITEM STRUCTURE REQUIREMENTS:
- For "mcq": Each object must have: "question" (string), "options" (array of exactly 4 strings), "answer" (string)
- For "short-answer": Each object must have: "question" (string), "suggestedAnswer" (string)  
- For "essay": Each object must have: "prompt" (string), "keyPoints" (string)

EXAMPLE FORMAT:
[
  {
    "question": "What is photosynthesis?",
    "options": ["A) Process of making food", "B) Process of breathing", "C) Process of growing", "D) Process of sleeping"],
    "answer": "A) Process of making food"
  }
]

Generate exactly ${count} items matching DoK Level ${dok} complexity.
`;

const getTosPrompt = (subject: string, termWeeks: number, focalAreas: { weekRange: string, areas: string }[], refinement: string) => `
You are a master curriculum designer for the GES in Ghana, creating an End of Term exam blueprint.
Your task is to generate a comprehensive Table of Specification (ToS) based on the provided focal areas.

${refinement ? `**CRITICAL REFINEMENT INSTRUCTION:** The user has provided feedback. Adhere to it strictly: "${refinement}"` : ''}

**OUTPUT MUST BE A SINGLE VALID JSON OBJECT WITH A ROOT KEY "tosData".**

The "tosData" key must contain an array of objects. Follow this JSON structure precisely.

**EXAMPLE OF THE REQUIRED JSON STRUCTURE:**
{
  "tosData": [
    {
      "weekRange": "1-2",
      "focalAreas": "1. Introduction to Topic A\\n2. Concept B",
      "questionDistribution": [
        { "type": "Multiple choice", "dok1": 5, "dok2": 3, "dok3": 2, "dok4": 0 },
        { "type": "Essay", "dok1": 2, "dok2": 2, "dok3": 1, "dok4": 0 },
        { "type": "Practical", "dok1": 3, "dok2": 2, "dok3": 1, "dok4": 0 }
      ]
    },
    {
      "weekRange": "3-4",
      "focalAreas": "1. Advanced Topic C\\n2. Application of D",
      "questionDistribution": [
        { "type": "Multiple choice", "dok1": 4, "dok2": 4, "dok3": 2, "dok4": 0 },
        { "type": "Essay", "dok1": 1, "dok2": 2, "dok3": 2, "dok4": 0 },
        { "type": "Practical", "dok1": 2, "dok2": 3, "dok3": 2, "dok4": 0 }
      ]
    }
  ]
}

**RULES:**
1.  For each "weekRange" provided by the user, generate a corresponding object in the "tosData" array.
2.  Each of these objects MUST have a "questionDistribution" array containing exactly three objects: one for "Multiple choice", one for "Essay", and one for "Practical".
3.  Distribute a TOTAL of 50-70 questions for the entire exam across all week ranges and DoK levels.
4.  Increase complexity in later weeks (more DoK 3/4 questions).

**USER-PROVIDED DATA TO USE:**
- Subject: ${subject}
- Total Weeks in Term: ${termWeeks}
- Focal Areas by Week: ${JSON.stringify(focalAreas)}
`;

const getRubricPrompt = (subject: string, grade: string, taskDescription: string, refinement: string) => `
You are an assessment expert. Generate a detailed grading rubric for the given task.
RULES:
1. The output MUST be a valid JSON object.
2. The JSON must have a key "rubricCriteria", which is an array of objects.
3. Each object must have keys: "criteria" (e.g., "Clarity of Argument"), "excellent" (string description for top marks), "proficient" (string), "developing" (string), and "points" (number).
4. Ensure the total points add up to a reasonable assessment total (e.g., 25, 50, or 100 points).

${refinement ? `**CRITICAL REFINEMENT INSTRUCTION:** The user has provided the following feedback on a previous version. Adhere to it strictly: "${refinement}"` : ''}

USER INPUT:
- Subject: ${subject}
- Grade: ${grade}
- Assessment Task: "${taskDescription}"
`;

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { generationType, ...params } = body;

        // *** THE DEFINITIVE FIX: Using a robust switch statement ***
        switch (generationType) {
            case 'assessment': {
                const { topic, grade, requests, refinement_prompt } = params;
                let allGeneratedItems: any[] = [];

                for (const request of requests) {
                    const { dok, type, count } = request;
                    if (count > 0) {
                        const userPrompt = getAssessmentPrompt(topic, grade, type, dok, count, refinement_prompt || '');
                        
                        const chatCompletion = await groq.chat.completions.create({
                            messages: [
                                { role: "system", content: "You must return ONLY a valid JSON array starting with [ and ending with ]. No wrapper objects, no commentary, no additional text. Just the raw JSON array." },
                                { role: "user", content: userPrompt }
                            ],
                            model: "meta-llama/llama-4-scout-17b-16e-instruct",
                            response_format: { type: "json_object" },
                        });

                        const responseJsonString = chatCompletion.choices[0]?.message?.content;
                        if (responseJsonString) {
                            const parsedResponse = JSON.parse(responseJsonString);
                            
                            // Handle different response formats
                            let items: any[] = [];
                            if (Array.isArray(parsedResponse)) {
                                items = parsedResponse;
                            } else if (parsedResponse.assessmentItems && Array.isArray(parsedResponse.assessmentItems)) {
                                items = parsedResponse.assessmentItems;
                            } else if (parsedResponse.items && Array.isArray(parsedResponse.items)) {
                                items = parsedResponse.items;
                            } else if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
                                items = parsedResponse.questions;
                            } else {
                                items = [parsedResponse];
                            }
                            
                            const itemsWithMetadata = items.map((item: any) => ({ ...item, dok, type }));
                            allGeneratedItems = [...allGeneratedItems, ...itemsWithMetadata];
                        }
                    }
                }

                const assessmentRecord = {
                    author_id: session.user.id,
                    assessment_data: { items: allGeneratedItems, topic, grade },
                    topic,
                    grade
                };
                const { data, error } = await supabase
                    .from('assessments')
                    .insert(assessmentRecord)
                    .select('id')
                    .single();
                
                if (error) throw error;
                
                return NextResponse.json({ assessmentId: data.id, assessmentItems: allGeneratedItems });
            }

            case 'rubric': {
                const { subject, grade, taskDescription, refinement_prompt } = params;
                const userPrompt = getRubricPrompt(subject, grade, taskDescription, refinement_prompt || '');
                
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: "Your output must be a single, valid JSON object, and nothing else." },
                        { role: "user", content: userPrompt }
                    ],
                    model: "meta-llama/llama-4-scout-17b-16e-instruct",
                    response_format: { type: "json_object" },
                });
                
                const responseJsonString = chatCompletion.choices[0]?.message?.content;
                if (!responseJsonString) throw new Error("AI returned an empty response.");
                
                const data = JSON.parse(responseJsonString);

                const { data: dbResult, error } = await supabase
                    .from('rubrics')
                    .insert({
                        author_id: session.user.id,
                        rubric_data: data,
                        subject,
                        grade,
                        task_description: taskDescription
                    })
                    .select('id')
                    .single();
                
                if (error) throw error;
                
                // This will now execute correctly within its own isolated case block.
                return NextResponse.json({ rubricId: dbResult.id, rubricCriteria: data.rubricCriteria });
            }

            case 'tos': {
                const { subject, termWeeks, focalAreas, refinement_prompt } = params;
                if (!subject || !focalAreas || focalAreas.length === 0) {
                    return NextResponse.json({ error: "Subject and at least one focal area are required." }, { status: 400 });
                }

                const userPrompt = getTosPrompt(subject, termWeeks, focalAreas, refinement_prompt || '');
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: "Your output must be a single, valid JSON object, and nothing else." },
                        { role: "user", content: userPrompt }
                    ],
                    model: "meta-llama/llama-4-scout-17b-16e-instruct",
                    response_format: { type: "json_object" },
                });

                const responseJsonString = chatCompletion.choices[0]?.message?.content;
                if (!responseJsonString) throw new Error("AI returned an empty response.");
                const data = JSON.parse(responseJsonString);

                // --- SAVE TO DATABASE ---
                const { data: dbResult, error } = await supabase
                    .from('tables_of_specification')
                    .insert({
                        author_id: session.user.id,
                        tos_data: data,
                        subject: subject
                    })
                    .select('id')
                    .single();
                if (error) throw error;
                
                return NextResponse.json({ tosId: dbResult.id, ...data });
            }

            default: {
                return NextResponse.json({ error: "Invalid generation type." }, { status: 400 });
            }
        }
    } catch (error: any) {
        console.error("Error in assessments API:", error.message);
        return NextResponse.json({ error: `Failed to generate content: ${error.message}` }, { status: 500 });
    }
}