import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import openai, { getCompletion } from "../configs/openai.js";
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

        res.json({ projectId: project.id });

        // Run the AI generation in the background safely
        const generateTask = async () => {
            try {
                // enhance user prompt
                const promptEnhanceResponse = await getCompletion({
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
                });

                const enhancePrompt = promptEnhanceResponse.choices[0].message.content;

                await prisma.conversation.create({
                    data: {
                        role: 'assistant',
                        content: `I've enhanced your prompt to: "${enhancePrompt}"`,
                        projectId: project.id
                    }
                });

                await prisma.conversation.create({
                    data: {
                        role: 'assistant',
                        content: `now generating your website...`,
                        projectId: project.id
                    }
                });

                // Generate website code
                const codeGenerationResponse = await getCompletion({
                    max_tokens: 8192,
                    messages: [
                        {
                            role: 'system',
                            content: `
                            You are an expert web developer specializing in visual excellence and premium UI/UX design. Create a complete, production-ready, visually stunning single-page website based on this request: "${enhancePrompt}"

                            MASTER UI/UX STRUCTURE BLUEPRINT (MANDATORY PAGE FLOW):
                            You must structure the generated single-page website with the following sections, styled with premium Tailwind utility classes:
                            1. NAVIGATION BAR: Sticky, transparent glassmorphism header (e.g., "sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-white/10") containing a beautiful text logo, desktop navigation links with active hover states, and a fully functional mobile hamburger menu operated via simple JavaScript.
                            2. HERO SECTION: A jaw-dropping presentation featuring:
                               - An eyebrow badge capsule (e.g. "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6") to draw attention.
                               - A massive, bold heading with gradient text (e.g., "text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 leading-none").
                               - A descriptive subtitle with balanced leading.
                               - Primary and outlined secondary call-to-action (CTA) buttons with scaling transitions on hover.
                               - A beautiful mock visual mockup (representing a dashboard screen, card, or interface) featuring rounded corners, subtle shadows, and a thin border.
                            3. FEATURES GRID: A responsive 3-column container showcasing the product or service features:
                               - Use modern card components (e.g., "bg-white/5 border border-white/10 p-6 rounded-2xl transition-all duration-300 hover:border-indigo-500/50 hover:shadow-indigo-500/5 hover:-translate-y-1").
                               - Include highly styled icon bubbles (Font Awesome icons placed inside styled backgrounds).
                               - Provide detailed headlines and informative copy for every feature.
                            4. TESTIMONIALS: A section showing trust and social proof:
                               - Grid of cards containing customer reviews.
                               - Include Unsplash/Pravatar profile pictures (e.g. <img class="w-10 h-10 rounded-full object-cover" src="https://i.pravatar.cc/100?img=12" alt="...">), customer name, job title, and glowing star rating icons (<i class="fas fa-star text-amber-400"></i>).
                            5. PRICING OR SERVICES: An interactive section showing 3 tiers/options:
                               - Highlight the "Popular" tier using a glowing indigo border or colored top badge.
                               - Detail clear, actual dollar pricing and write a robust checklist of features with styled checkmark icons.
                            6. CONTACT FORM: A glassmorphism block containing structured input fields with glowing focus rings, proper labels, and an interactive submit button.
                            7. FOOTER: Multiple columns for links, logo, social icon row (GitHub, Twitter, LinkedIn), and copyright text.

                            VISUAL AND DESIGN STANDARDS (CRITICAL FOR UX):
                            - Use a sophisticated, modern dark theme palette (Slate-950/Slate-900 background) paired with vibrant gradient accent highlights (indigo, teal, purple, rose).
                            - Load modern, premium Google Fonts in the <head> (e.g., family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800) and apply to the body.
                            - Include the Font Awesome CDN for icons in the <head>: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                            - Apply responsive design flawlessly at all width breakpoints (sm:, md:, lg:, xl:).
                            - Add interactive JavaScript components (hamburger menu toggling, pricing switcher) inside script tags at the bottom.
                            - Utilise micro-animations, transitions, and hover-state scale/translation effects to make the interface feel premium and alive.

                            CONTENT AND COPYWRITING STANDARDS (CRITICAL):
                            - Write actual, tailored marketing copy for every header, description, checklist item, pricing option, and testimonial text.
                            - NEVER use "Lorem Ipsum", "lorem ipsum dolor...", "text here", or other placeholders.

                            CRITICAL REQUIREMENTS:
                            - You MUST output valid HTML ONLY. 
                            - Use Tailwind CSS for ALL styling
                            - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                            - Include all JavaScript in <script> tags before closing </body>
                            - Use placeholder images from https://placehold.co/600x400
                            - Make sure it's a complete, standalone HTML document with Tailwind CSS
                            - Return the HTML Code Only, nothing else

                            CRITICAL HARD RULES:
                            1. You MUST put ALL output ONLY into message.content.
                            2. You MUST NOT place anything in "reasoning", "analysis", "reasoning_details", or any hidden fields.
                            3. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
                            4. Do NOT include markdown, explanations, notes, or code fences (no \`\`\`html).

                            The HTML should be complete and ready to render as-is with Tailwind CSS.
                            `
                        },
                        {
                            role: 'user',
                            content: enhancePrompt || ''
                        }
                    ]
                });

                const code = codeGenerationResponse.choices[0].message.content || '';

                if (!code) {
                    await prisma.conversation.create({
                        data: {
                            role: 'assistant',
                            content: "Unable to generate the code, please try again",
                            projectId: project.id
                        }
                    });
                    await prisma.user.update({
                        where: { id: userId },
                        data: { credits: { increment: 5 } }
                    });
                    return;
                }

                // create version for the project
                const version = await prisma.version.create({
                    data: {
                        code: code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim(),
                        description: 'Initial version',
                        projectId: project.id
                    }
                });

                await prisma.conversation.create({
                    data: {
                        role: 'assistant',
                        content: "I've created your website ! You can now preview it and request any changes.",
                        projectId: project.id
                    }
                });

                await prisma.websiteProject.update({
                    where: { id: project.id },
                    data: {
                        current_code: code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim(),
                        current_version_index: version.id
                    }
                });
            } catch (innerError: any) {
                console.error("Background AI Generation Error:", innerError);
                await prisma.conversation.create({
                    data: {
                        role: 'assistant',
                        content: `Unable to generate the website code: ${innerError.message || "Unknown error"}. Your credits have been refunded.`,
                        projectId: project.id
                    }
                });
                await prisma.user.update({
                    where: { id: userId },
                    data: { credits: { increment: 5 } }
                });
            }
        };

        try {
            const { waitUntil } = await import('@vercel/functions');
            waitUntil(generateTask());
        } catch (e) {
            // Local fallback if running outside of Vercel
            generateTask();
        }
    } catch (error: any) {
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

        res.json({ message: project.isPublished ? 'Project Unpublished' : 'Project Published Successfully' })

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