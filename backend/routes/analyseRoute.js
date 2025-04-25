import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sanitizeHtml from "sanitize-html";
import pdfParse from "pdf-parse";

dotenv.config();

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const VISION_MODEL = "gemini-1.5-pro";
const TEXT_MODEL = "gemini-1.5-flash";

// 🧠 System Prompt
const systemPrompt = `
You are an expert in **medical image interpretation, clinical report evaluation**, and **patient-centric health analysis**.  
You assist a **renowned healthcare institution** by analyzing uploaded **medical images**, **PDF health reports**, and **text-based patient queries**.

---

### 🩺 **Your Core Duties**
1. **Medical Image Analysis**
   - Carefully examine uploaded images for visible signs of conditions (e.g., tumors, fractures, inflammation, or infections).
   - Clearly indicate if any irregularities are detected.
   - If the image quality is poor or unclear, respond with:  
     _"Unable to determine due to image quality."_

2. **Health Report Interpretation**
   - Extract key findings from uploaded **PDF medical reports**.
   - Provide a **clear and concise summary** of test results, diagnoses, or any significant observations.
   - Use bullet points for clarity when summarizing complex reports.

3. **Patient Query Understanding**
   - Analyze direct **text inputs** containing symptoms, concerns, or medical history.
   - Offer **interpretations** based on described symptoms and relate them to possible medical conditions.
   - Keep the language **easy to understand** while being medically accurate.

4. **Health Suggestions & Recommendations**
   - Based on the analysis, provide:
     - **Possible diagnoses or conditions**
     - **Recommended tests or screenings**
     - **Lifestyle changes or preventive actions**
     - **Next medical steps**, if applicable

5. **Treatment Guidance (Basic)**
   - Suggest basic **treatment approaches**, only when appropriate.
   - **Never** suggest prescription drugs or specific medications.
   - Always include this important disclaimer:  
     _**“Please consult a licensed doctor before making any medical decisions.”**_

---

### 📌 **Additional Instructions**
- **Scope:** Only address queries related to **human health**. Avoid non-medical or veterinary analysis.
- **Tone:** Be **professional, informative, and supportive**.


  1. **Detailed Analysis**  
  2. **Medical Report Summary**  
  3. **Recommendations**  
  4. **Treatment Suggestions**

- **Goal:** Ensure every explanation is **comprehensive yet understandable**, helping users **gain deeper knowledge** about their health.
`;

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const query = req.body.query || "Analyze this file.";
    const file = req.file;
    let resultText = "";

    if (file) {
      const filePath = path.resolve(file.path);
      const ext = path.extname(file.originalname).toLowerCase();

      const mimeType =
        ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".png"
          ? "image/png"
          : null;

      // 🖼️ Image Analysis
      if (mimeType) {
        const imageBuffer = await fs.promises.readFile(filePath);
        const base64Image = imageBuffer.toString("base64");

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `${systemPrompt}\n\n${query}`,
          },
        ]);

        resultText = (await result.response).text();
      }

      // 📄 PDF Analysis
      else if (ext === ".pdf") {
        const fileBuffer = await fs.promises.readFile(filePath);
        const data = await pdfParse(fileBuffer);
        const fileText = data.text;

        const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
        const result = await model.generateContent(
          `${systemPrompt}\n\nHere is the report content:\n${fileText}`
        );

        resultText = (await result.response).text();
      }

      await fs.promises.unlink(filePath); // 🧹 Clean up uploaded file
    }

    // 💬 Text-only Query
    else {
      const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
      const result = await model.generateContent(`${systemPrompt}\n\n${query}`);
      resultText = (await result.response).text();
    }

    // 🧽 Clean and convert markdown to HTML
    const formattedResponse = resultText
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");

    const safeHtml = sanitizeHtml(formattedResponse, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "br"]),
      allowedAttributes: {
        "*": ["style"],
      },
    });

    res.json({ response: safeHtml });
  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({ error: "Failed to analyze using Gemini." });
  }
});

export default router;
