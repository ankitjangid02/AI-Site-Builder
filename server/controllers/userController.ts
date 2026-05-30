import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import openai from "../configs/openai.js";
import Stripe from "stripe";


// get user credits
export const getUserCredits = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })
        res.json({ credits: user?.credits })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// controller function to create new project
export const createUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
    try {
        const { initial_prompt } = req.body;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (user && user.credits < 5) {
            return res.status(403).json({ message: 'add credits to create more projects' });
        }

        //create a new project
        const project = await prisma.websiteProject.create({
            data: {
                name: initial_prompt.length > 50 ? initial_prompt.substring(0, 47) + '...' : initial_prompt,
                initial_prompt,
                userId
            }
        })

        // update user's total creation
        await prisma.user.update({
            where: { id: userId },
            data: { totalCreation: { increment: 1 } }
        })

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: initial_prompt,
                projectId: project.id
            }
        })

        await prisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: 5 } }
        })

        res.json({ projectId: project.id })

        // enhance user prompt
        const promptEnhanceResponse = await openai.chat.completions.create({
            model: 'google/gemini-2.5-flash',
            max_tokens: 2048,
            messages: [
                {
                    role: 'system',
                    content: `You are a prompt enhancement specialist. Take the user's website request and transform it into a highly detailed, professional website generation prompt that can be used by modern AI website builders or frontend AI agents.

                    Enhance the request by:
                    1. Defining a modern UI/UX design style, layout structure, spacing, typography, animations, and color palette
                    2. Specifying all important sections, pages, and components the website should contain
                    3. Describing user interactions, hover effects, transitions, responsiveness, accessibility, and mobile-first behavior
                    4. Including modern frontend best practices such as clean navigation, reusable components, SEO-friendly structure, fast loading performance, and responsive design
                    5. Adding missing but essential features like testimonials, CTA sections, pricing tables, authentication flows, dashboards, analytics, contact forms, notifications, loading states, and footer details when relevant
                    6. Mentioning preferred technologies, frameworks, or integrations if useful (React, Tailwind CSS, Framer Motion, charts, APIs, authentication, databases, etc.)
                    7. Making the final website visually polished, production-ready, and optimized for both desktop and mobile experiences

                    Return ONLY the enhanced website prompt. Do not explain anything else. Keep the response detailed, structured, and concise (maximum 2-3 well-written paragraphs).`
                },
                {
                    role: 'user',
                    content: initial_prompt

                }
            ]
        })

        const enhancePrompt = promptEnhanceResponse.choices[0].message.content;

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I've enhanced your prompt to: "${enhancePrompt}"`,
                projectId: project.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `now generating your website...`,
                projectId: project.id
            }
        })

        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: 'google/gemini-2.5-flash',
            max_tokens: 8192,
            messages: [
                {
                    role: 'system',
                    content: `
                    You are an expert web developer. Create a complete, production-ready, single-page website based on this request: "${enhancePrompt}"

                    CRITICAL REQUIREMENTS:
                    - You MUST output valid HTML ONLY. 
                    - Use Tailwind CSS for ALL styling
                    - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                    - Use Tailwind utility classes extensively for styling, animations, and responsiveness
                    - Make it fully functional and interactive with JavaScript in <script> tag before closing </body>
                    - Use modern, beautiful design with great UX using Tailwind classes
                    - Make it responsive using Tailwind responsive classes (sm:, md:, lg:, xl:)
                    - Use Tailwind animations and transitions (animate-*, transition-*)
                    - Include all necessary meta tags
                    - Use Google Fonts CDN if needed for custom fonts
                    - Use placeholder images from https://placehold.co/600x400
                    - Use Tailwind gradient classes for beautiful backgrounds
                    - Make sure all buttons, cards, and components use Tailwind styling

                    CRITICAL HARD RULES:
                    1. You MUST put ALL output ONLY into message.content.
                    2. You MUST NOT place anything in "reasoning", "analysis", "reasoning_details", or any hidden fields.
                    3. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
                    4. Do NOT include markdown, explanations, notes, or code fences.

                    The HTML should be complete and ready to render as-is with Tailwind CSS.
                    `
                },
                {
                    role: 'user',
                    content: enhancePrompt || ''
                }
            ]
        })

        const code = codeGenerationResponse.choices[0].message.content || '';

        if (!code) {
            await prisma.conversation.create({
                data: {
                    role: 'assistant',
                    content: "Unable to generate the code, please try again",
                    projectId: project.id
                }
            })
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 5 } }
            })
            return;
        }

        // create version for the project
        const version = await prisma.version.create({
            data: {
                code: code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim(),
                description: 'Initial version',
                projectId: project.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've created your website ! You can now preview it and request any changes.",
                projectId: project.id
            }
        })

        await prisma.websiteProject.update({
            where: { id: project.id },
            data: {
                current_code: code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim(),
                current_version_index: version.id
            }
        })

    } catch (error: any) {
        await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: 5 } }
        })
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

// controller function to get  a single user project
export const getUserProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { projectId } = req.params;

        const project = await prisma.websiteProject.findFirst({
            where: { id: projectId as string, userId },
            include: {
                conversation: {
                    orderBy: { timestamp: 'asc' }
                },
                versions: { orderBy: { timestamp: 'asc' } }
            }
        })
        res.json({ project })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// controller function to get all users projects
export const getUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const projects = await prisma.websiteProject.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
        })

        res.json({ projects })

    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// controller function to toggle project publish
export const togglePublish = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { projectId } = req.params;

        const project = await prisma.websiteProject.findFirst({
            where: { id: projectId as string, userId },
        })

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.websiteProject.update({
            where: { id: projectId as any },
            data: { isPublished: !project.isPublished }
        })

        res.json({ message: project.isPublished ? 'Project Unpublished' : 'Project Published Succeessfully' })

    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}


// export const deleteProject = async (req: Request, res: Response) => {
//   try {
//     const userId = req.userId

//     if (!userId) {
//       return res.status(401).json({
//         message: "Unauthorized",
//       })
//     }

//     const { projectId } = req.params

//     const project = await prisma.websiteProject.findFirst({
//       where: {
//         id: projectId as string,
//         userId,
//       },
//     })

//     if (!project) {
//       return res.status(404).json({
//         message: "Project not found",
//       })
//     }

//     // delete child records first
//     await prisma.conversation.deleteMany({
//       where: {
//         projectId: project.id,
//       },
//     })

//     await prisma.version.deleteMany({
//       where: {
//         projectId: project.id,
//       },
//     })

//     // delete project
//     await prisma.websiteProject.delete({
//       where: {
//         id: project.id,
//       },
//     })

//     res.json({
//       message: "Project deleted successfully",
//     })

//   } catch (error: any) {
//     console.log(error.code || error.message)

//     res.status(500).json({
//       message: error.message,
//     })
//   }
// }

// controller function to purchase credits
export const purchaseCredits = async (req: Request, res: Response) => {
    try {
        interface Plan {
            credits: number;
            amount: number;
        }
        const plans = {
            basic: { credits: 100, amount: 5 },
            pro: { credits: 400, amount: 19 },
            enterprise: { credits: 1000, amount: 49 },
        }

        const userId = req.userId;
        const { planId } = req.body as { planId: keyof typeof plans }
        const origin = req.headers.origin as string;

        const plan: Plan = plans[planId]

        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: userId!,
                planId: req.body.planId,
                amount: plan.amount,
                credits: plan.credits
            }
        })

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/loading`,
            cancel_url:`${origin}`,
            line_items: [
                {
                    price_data: {
                        currency:'usd',
                        product_data:{
                            name:`AiSiteBuilder - ${plan.credits} credits`
                        },
                        unit_amount: Math.floor(transaction.amount) * 100
                    },
                    quantity: 1
                },
            ],
            mode: 'payment',
            metadata:{
                transactionId: transaction.id,
                appId: 'ai-site-builder'
            },
            expires_at:Math.floor(Date.now() / 1000) + 30 * 60, // expires in 30 mins
        });

        res.json({payment_link: session.url})

    } catch (error: any) {
        console.log(error.code || error.message)
        res.status(500).json({message: error.message,})
    }
}