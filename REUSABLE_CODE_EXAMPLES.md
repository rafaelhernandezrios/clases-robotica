# 💻 Ejemplos de Código Reutilizables

Este documento contiene ejemplos de código específicos que puedes reutilizar directamente en tu nuevo proyecto.

---

## 🔐 1. Autenticación con MongoDB

### 1.1 Modelo de Usuario Base

```javascript
// backend/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    academic_level: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
```

### 1.2 Conexión a MongoDB

```javascript
// backend/config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("Error al conectar a MongoDB", error);
    process.exit(1);
  }
};

export default connectDB;
```

### 1.3 Registro de Usuario

```javascript
// backend/routes/authRoutes.js
import bcrypt from "bcryptjs";
import User from "../models/User.js";

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, dob, gender, academic_level } = req.body;

    // Validaciones
    if (!name || !email || !password || !dob || !gender || !academic_level) {
      return res.status(400).json({ message: "Faltan campos requeridos." });
    }

    // Normalizar email
    const normalizedEmail = String(email).toLowerCase().trim();

    // Verificar duplicados
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ message: "El correo ya está registrado." });
    }

    // Hash de contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      dob,
      gender,
      academic_level,
      isActive: false, // Cuentas nuevas inactivas
    };

    const user = await User.create(userData);

    return res.status(201).json({ 
      message: "Usuario registrado con éxito", 
      userId: user._id 
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ 
        message: "Datos inválidos", 
        details: error.errors 
      });
    }
    console.error("Error en el registro:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
});
```

### 1.4 Login de Usuario

```javascript
// backend/routes/authRoutes.js
import jwt from "jsonwebtoken";

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    // Verificar cuenta activa
    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Tu cuenta está inactiva. Contacta al administrador." 
      });
    }

    // Generar JWT
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "8h" }
    );

    res.json({ 
      token, 
      userId: user._id, 
      name: user.name, 
      role: user.role 
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el login", error });
  }
});
```

### 1.5 Middleware de Autenticación

```javascript
// backend/routes/authRoutes.js
const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Acceso denegado, token requerido" });
  }

  try {
    const cleanToken = token.replace("Bearer ", "").trim();
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    
    // Verificar usuario activo
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Tu cuenta está inactiva." 
      });
    }
    
    next();
  } catch (error) {
    console.error("Error verificando token:", error.message);
    res.status(401).json({ message: "Token inválido" });
  }
};

export { router as authRoutes, authMiddleware };
```

---

## 📄 2. Subida y Análisis de CV

### 2.1 Configuración de Upload a S3

```javascript
// backend/middleware/upload.js
import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = `${Date.now()}_${file.originalname}`;
      cb(null, fileName);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default upload;
```

### 2.2 Multer con almacenamiento local o S3 (STORAGE_TYPE)

Patrón reutilizable para subir archivos a disco local en desarrollo o a S3 en producción, según `process.env.STORAGE_TYPE` (`'local'` o `'s3'`). Útil para fotos, comprobantes de pago, videos, etc.

```javascript
// backend/middleware/photoUpload.js (ejemplo: solo imágenes)
import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";
const photosDir = path.join(__dirname, "../uploads/photos");

if (STORAGE_TYPE === "local") {
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }
}

let photoUpload;

if (STORAGE_TYPE === "s3" && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  photoUpload = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_BUCKET_NAME,
      acl: "public-read",
      metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
      key: (req, file, cb) => {
        const fileName = `photos/profile_${Date.now()}_${req.userId || "unknown"}.${file.mimetype.split("/")[1]}`;
        cb(null, fileName);
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });
} else {
  photoUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, photosDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `profile_${Date.now()}_${req.userId || "unknown"}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  });
}

export default photoUpload;
export { STORAGE_TYPE };
```

Para PDFs (comprobantes de pago): usar la misma estructura cambiando la carpeta (`uploads/payment-proofs`), `fileFilter` a `application/pdf` y el prefijo de la key en S3 (`payment-proofs/`). Para videos, ver `videoUpload.js` (límite mayor, MIME types de video).

### 2.3 Endpoint de Subida de CV

```javascript
// backend/routes/userRoutes.js
import upload from "../middleware/upload.js";
import { authMiddleware } from "../routes/authRoutes.js";

router.post("/upload-cv", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se ha subido ningún archivo" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Guardar URL de S3
    user.cvPath = req.file.location;
    await user.save();

    return res.status(200).json({
      message: "CV subido correctamente",
      filePath: user.cvPath,
    });
  } catch (error) {
    console.error("Error al subir el archivo:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});
```

### 2.4 Extracción de Texto del PDF

```javascript
// backend/utils/cvUtils.js
import { PDFExtract } from 'pdf.js-extract';
import axios from 'axios';

export async function extractTextFromPdf(pdfUrl) {
  try {
    // Descargar desde S3
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer'
    });
    
    const pdfBuffer = Buffer.from(response.data);
    const pdfExtract = new PDFExtract();
    
    // Extraer texto
    const data = await pdfExtract.extractBuffer(pdfBuffer, {});
    const text = data.pages
      .map(page => page.content.map(item => item.str).join(' '))
      .join('\n');
    
    return text.trim();
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw error;
  }
}
```

### 2.5 Análisis de CV con OpenAI

```javascript
// backend/utils/cvUtils.js
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeCvText(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Eres un experto en análisis de currículums." 
        },
        { 
          role: "user", 
          content: `Extrae las habilidades duras y blandas así como la experiencia más relevantes del siguiente CV:\n\n${text}` 
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error en analyzeCvText:", error);
    return "Error en el análisis del CV.";
  }
}
```

### 2.6 Generación de Preguntas de Entrevista

```javascript
// backend/utils/cvUtils.js
export async function generateQuestions(skills) {
  const prompt = `
Basado en las siguientes habilidades extraídas del CV, genera 10 preguntas de entrevista:
- 5 preguntas sobre habilidades duras.
- 5 preguntas sobre habilidades blandas.

Habilidades encontradas en el CV:
${skills.join(", ")}

Unicamente responde en el siguiente formato, sin agregar nada mas:
1. Pregunta sobre habilidad dura
2. Pregunta sobre habilidad dura
...
10. Pregunta sobre habilidad blanda
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.7,
  });

  let questions = response.choices[0].message.content
    .split("\n")
    .map(q => q.trim())
    .filter(Boolean);

  return questions.slice(0, 10);
}
```

### 2.7 Endpoint Completo de Análisis

```javascript
// backend/routes/userRoutes.js
router.post("/analyze-cv", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.cvPath) {
      return res.status(404).json({ message: "No CV stored for analysis" });
    }

    // 1. Extraer texto
    const cvText = await extractTextFromPdf(user.cvPath);

    // 2. Analizar con GPT
    const analysisResult = await analyzeCvText(cvText);

    // 3. Convertir a array de habilidades
    const allSkills = analysisResult
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    // 4. Generar preguntas
    const questions = await generateQuestions(allSkills);

    // 5. Calcular score inicial
    const score = Math.min(allSkills.length * 10, 100);

    // 6. Guardar en DB
    user.cvText = cvText;
    user.analysis = analysisResult;
    user.skills = allSkills;
    user.questions = questions;
    user.score = score;
    user.cvAnalyzed = true;

    await user.save();

    res.json({ 
      message: "CV analizado con éxito", 
      userId: user._id,
      questions,
      score
    });
  } catch (error) {
    console.error("Error procesando CV:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
```

---

## 🗣️ 3. Sistema de Entrevista con IA

### 3.1 Evaluación de Respuestas con GPT

```javascript
// backend/utils/cvUtils.js
export async function calculateScoreBasedOnAnswers(questions, answers) {
  try {
    if (!questions || !answers || questions.length !== answers.length) {
      throw new Error("Número de preguntas y respuestas no coincide.");
    }

    const prompt = `
Eres un evaluador experto de entrevistas técnicas y de habilidades blandas. 
Evalúa las siguientes respuestas en una escala del 0 al 100 según su calidad, claridad y relevancia para la pregunta. 

Para cada respuesta, proporciona:
1. Un puntaje entre 0 y 100.
2. Una breve explicación de la evaluación.

Aquí están las preguntas y respuestas:

${questions.map((q, i) => `Pregunta: ${q}\nRespuesta: ${answers[i]}\n`).join("\n")}

Responde en el siguiente formato JSON:
[
  { "score": 85, "explanation": "Respuesta clara y bien fundamentada con ejemplos." },
  { "score": 70, "explanation": "Buena respuesta pero le falta detalle." },
  ...
]
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const evaluation = JSON.parse(response.choices[0].message.content);
    const total_score = evaluation.reduce((acc, item) => acc + item.score, 0) / evaluation.length;

    return {
      total_score: Math.round(total_score),
      evaluations: evaluation,
    };
  } catch (error) {
    console.error("Error al evaluar respuestas:", error);
    return {
      total_score: 0,
      evaluations: [],
      error: "Error en la evaluación de respuestas",
    };
  }
}
```

### 3.2 Endpoint de Envío de Entrevista

```javascript
// backend/routes/userRoutes.js
router.post("/submit-interview", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const { answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "No se enviaron respuestas válidas" });
    }

    const questions = user.questions || [];
    if (questions.length !== answers.length) {
      return res.status(400).json({ 
        message: "Número de respuestas no coincide con las preguntas." 
      });
    }

    // Evaluar con GPT
    const { total_score, evaluations } = await calculateScoreBasedOnAnswers(questions, answers);

    // Guardar en DB
    user.interviewResponses = answers;
    user.interviewScore = total_score;
    user.interviewAnalysis = evaluations;
    user.interviewCompleted = true;

    await user.save();

    return res.json({
      message: "Entrevista evaluada y almacenada con éxito",
      total_score,
      evaluations,
    });
  } catch (error) {
    console.error("Error al procesar la entrevista:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});
```

---

## 📊 4. Cuestionarios de Habilidades

### 4.1 Evaluación de Habilidades Blandas

```javascript
// backend/utils/cvUtils.js
export const evaluateSoftSkills = (responses) => {
  const competencies = {
    "Cognitiva": {
      "Pensamiento Analítico": [1, 21, 41, 61, 81, 101, 121, 141],
      "Respuesta ante los problemas": [2, 22, 42, 62, 82, 102, 122, 142],
      "Iniciativa": [3, 23, 43, 63, 83, 103, 123, 143]
    },
    // ... más competencias
  };

  const scoreLevels = {
    "Cognitiva": {
      "Nivel muy bajo": [24, 78],
      "Nivel bajo": [79, 85],
      "Nivel medio": [86, 105],
      "Nivel alto": [106, 115],
      "Nivel muy alto": [116, 120]
    },
    // ... más niveles
  };

  let results = {};
  let totalScore = 0;

  // Evaluar cada competencia
  for (const [competency, skills] of Object.entries(competencies)) {
    let competencyScore = 0;
    let skillResults = {};

    for (const [skill, questions] of Object.entries(skills)) {
      let sum = questions.reduce((acc, qNum) => 
        acc + (parseInt(responses[qNum - 1]) || 0), 0
      );
      competencyScore += sum;
      skillResults[skill] = { score: sum };
    }

    // Determinar nivel
    let level = "Nivel muy bajo";
    for (const [levelName, range] of Object.entries(scoreLevels[competency])) {
      if (competencyScore >= range[0] && competencyScore <= range[1]) {
        level = levelName;
        break;
      }
    }

    results[competency] = {
      score: competencyScore,
      level,
      skills: skillResults
    };

    totalScore += competencyScore;
  }

  // Nivel institucional
  let institutionalLevel = "Nivel muy bajo";
  const institutionalLevels = {
    "Nivel muy bajo": [160, 561],
    "Nivel bajo": [562, 596],
    "Nivel medio": [597, 708],
    "Nivel alto": [709, 757],
    "Nivel muy alto": [758, 800]
  };

  for (const [levelName, range] of Object.entries(institutionalLevels)) {
    if (totalScore >= range[0] && totalScore <= range[1]) {
      institutionalLevel = levelName;
      break;
    }
  }

  return {
    totalScore,
    institutionalLevel,
    results
  };
};
```

### 4.2 Endpoint de Envío de Habilidades Blandas

```javascript
// backend/routes/userRoutes.js
router.post("/submit-soft-skills", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const { responses } = req.body;

    if (!responses) {
      return res.status(400).json({ message: "No se enviaron respuestas" });
    }

    // Evaluar
    const evaluation = evaluateSoftSkills(responses);

    // Guardar en DB
    user.softSkillsResults = {
      results: evaluation.results,
      totalScore: evaluation.totalScore,
      institutionalLevel: evaluation.institutionalLevel
    };
    user.softSkillsSurveyCompleted = true;

    await user.save();

    res.json({
      message: "Encuesta de habilidades blandas guardada exitosamente",
      ...evaluation
    });
  } catch (error) {
    console.error("Error al procesar la encuesta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
```

### 4.3 Evaluación de Habilidades Duras (Inteligencias Múltiples)

```javascript
// backend/utils/cvUtils.js
export const evaluateMultipleIntelligences = (responses) => {
  const intelligences = {
    "Inteligencia Comunicativa": [9, 10, 17, 22, 30],
    "Inteligencia Matemática": [5, 7, 15, 20, 25],
    "Inteligencia Visual": [1, 11, 14, 23, 27],
    "Inteligencia Motriz": [8, 16, 19, 21, 29],
    "Inteligencia Rítmica": [3, 4, 13, 24, 28],
    "Inteligencia de Autoconocimiento": [2, 6, 26, 31, 33],
    "Inteligencia Social": [12, 18, 32, 34, 35],
  };

  const scoreLevels = {
    "Nivel bajo": [2, 2],   // 2 respuestas verdaderas
    "Nivel medio": [3, 3],  // 3 respuestas verdaderas
    "Nivel alto": [4, 5],   // 4 o más respuestas verdaderas
  };

  let results = {};
  let totalScore = 0;

  for (const [intelligence, questionNumbers] of Object.entries(intelligences)) {
    let countTrue = questionNumbers.filter(
      (qNum) => responses[qNum] === "5"
    ).length;
    
    totalScore += countTrue * 5;

    // Asignar nivel
    let level = "Nivel bajo";
    for (const [levelName, range] of Object.entries(scoreLevels)) {
      if (countTrue >= range[0] && countTrue <= range[1]) {
        level = levelName;
        break;
      }
    }

    results[intelligence] = { 
      score: countTrue * 5, 
      level 
    };
  }

  return { totalScore, results };
};
```

---

## 🗣️ 3.3 Sistema de Text-to-Speech con ElevenLabs

### 3.3.1 Endpoint de Text-to-Speech

```javascript
// backend/routes/userRoutes.js
import axios from "axios";

router.post("/text-to-speech", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ message: "Text is required" });
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel

    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({ 
        message: "Eleven Labs API key not configured",
        error: "ELEVENLABS_API_KEY environment variable is missing"
      });
    }

    // Call Eleven Labs API
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text: text,
        model_id: "eleven_multilingual_v2", // Multilingual model for better quality
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        responseType: 'arraybuffer' // Get audio as binary data
      }
    );

    // Convert arraybuffer to base64 for sending to frontend
    const audioBuffer = Buffer.from(response.data);
    const base64Audio = audioBuffer.toString('base64');

    res.json({
      audio: base64Audio,
      mimeType: 'audio/mpeg'
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error generating speech",
      error: error.response?.data?.message || error.message,
      details: error.response?.data || null
    });
  }
});
```

### 3.3.2 Uso en Frontend con Máquina de Estados

```javascript
// frontend/src/pages/Interview.jsx
const [voiceState, setVoiceState] = useState('IDLE'); // IDLE, READING_QUESTION, RECORDING, TRANSCRIBING, REVIEW_MODE
const audioRef = useRef(null);

const readQuestionAloud = async (questionText) => {
  return new Promise(async (resolve, reject) => {
    // PROHIBICIÓN: No leer durante transcripción
    if (voiceState === 'TRANSCRIBING') {
      resolve();
      return;
    }

    // LIMPIEZA: Cancelar cualquier TTS activo
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // TRANSICIÓN: IDLE → READING_QUESTION
    setVoiceState('READING_QUESTION');

    try {
      // Llamar al endpoint de Eleven Labs
      const response = await api.post('/users/text-to-speech', { text: questionText });
      
      if (!response.data || !response.data.audio) {
        throw new Error('No audio data received from server');
      }

      const { audio: base64Audio, mimeType } = response.data;

      // Convertir base64 a blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: mimeType || 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Crear elemento de audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // REQUERIMIENTO CRÍTICO: Esperar estrictamente a onAudioEnd
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setVoiceState('IDLE');
        resolve();
      };

      // Manejo de errores
      audio.onerror = (event) => {
        console.error('[TTS] Error reproduciendo audio:', event);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setVoiceState('IDLE');
        // Fallback a Web Speech API si Eleven Labs falla
        fallbackToSpeechSynthesis(questionText, resolve);
      };

      // Reproducir audio
      await audio.play();
    } catch (error) {
      console.error('[TTS] Error con Eleven Labs:', error);
      // Fallback a Web Speech API si Eleven Labs no está disponible
      fallbackToSpeechSynthesis(questionText, resolve);
    }
  });
};

// Fallback a Web Speech API
const fallbackToSpeechSynthesis = (questionText, resolve) => {
  if (!('speechSynthesis' in window)) {
    setVoiceState('IDLE');
    resolve();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(questionText);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
  utterance.voice = englishVoices.length > 0 ? englishVoices[0] : voices[0];

  utterance.onend = () => {
    setVoiceState('IDLE');
    resolve();
  };

  utterance.onerror = (event) => {
    console.error('[TTS] Fallback error:', event.error);
    setVoiceState('IDLE');
    resolve();
  };

  window.speechSynthesis.speak(utterance);
};
```

### 3.4 Transcripción de Video con Whisper

```javascript
// backend/utils/cvUtils.js
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeVideoAudio(filePath) {
  let transcriptionAttempts = 0;
  const maxTranscriptionAttempts = 3;
  
  // Validate file exists and has content
  if (!fs.existsSync(filePath)) {
    throw new Error(`Video file not found: ${filePath}`);
  }
  
  const fileStats = fs.statSync(filePath);
  if (fileStats.size < 1024) {
    throw new Error(`Video file is too small (${fileStats.size} bytes). The video may not contain audio.`);
  }
  
  while (transcriptionAttempts < maxTranscriptionAttempts) {
    try {
      transcriptionAttempts++;
      
      // Create a readable stream from the file for OpenAI
      const fileStream = fs.createReadStream(filePath);
      
      // Add timeout wrapper for Whisper API call (90 seconds for larger files)
      const transcriptionPromise = openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language: 'en', // Set language for better accuracy
        response_format: 'text',
        temperature: 0, // More deterministic, less hallucinations
        prompt: 'Job interview in English. Precise transcription of the candidate\'s answer:'
      });
      
      // Race between transcription and timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Whisper API timeout after 90 seconds')), 90000)
      );
      
      const transcription = await Promise.race([transcriptionPromise, timeoutPromise]);
      
      const transcriptionText = typeof transcription === 'string' ? transcription : transcription.text || '';
      const trimmedText = transcriptionText.trim();
      
      if (!trimmedText || trimmedText.length === 0) {
        throw new Error('Transcription returned empty result. The video may not contain audible speech.');
      }
      
      // Filter hallucinations (common Whisper errors)
      const filteredText = filterWhisperHallucinations(trimmedText);
      
      if (!filteredText || filteredText.trim().length === 0) {
        throw new Error('Transcription returned empty result after filtering.');
      }
      
      return filteredText;
    } catch (error) {
      // If it's a file format error, don't retry
      if (error.message.includes('format') || 
          error.message.includes('codec') || 
          error.message.includes('not supported') ||
          error.status === 400) {
        throw new Error(`Video format error: ${error.message}`);
      }
      
      // If it's the last attempt, throw the error
      if (transcriptionAttempts >= maxTranscriptionAttempts) {
        throw new Error(`Failed to transcribe audio after ${maxTranscriptionAttempts} attempts: ${error.message}`);
      }
      
      // Wait before retry (exponential backoff)
      const waitTime = 2000 * Math.pow(2, transcriptionAttempts - 1); // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Filter common Whisper hallucinations
function filterWhisperHallucinations(text) {
  const hallucinations = [
    'Thank you for watching',
    'Thanks for watching',
    'Please subscribe',
    'Like and subscribe',
    'Thank you',
    'You',
    'Thank you so much',
    'Thanks',
  ];
  
  let filtered = text;
  for (const hallucination of hallucinations) {
    filtered = filtered.replace(new RegExp(hallucination, 'gi'), '');
  }
  
  return filtered.trim();
}
```

### 3.5 Guardado Automático de Progreso

```javascript
// backend/routes/userRoutes.js
router.post("/save-interview-progress", authMiddleware, async (req, res) => {
  try {
    const { answers, currentQuestionIndex } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Guardar respuestas de texto (el video se guarda por separado)
    user.interviewResponses = answers || [];
    
    // Guardar índice de pregunta actual para continuar después
    user.currentQuestionIndex = currentQuestionIndex || 0;

    await user.save();

    res.json({ 
      message: "Progreso guardado exitosamente",
      currentQuestionIndex: user.currentQuestionIndex
    });
  } catch (error) {
    console.error("Error guardando progreso:", error);
    res.status(500).json({ message: "Error saving progress" });
  }
});
```

---

## 🛡️ 5. Middleware de Admin

```javascript
// backend/middleware/adminMiddleware.js
import User from "../models/User.js";

export const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: "Acceso denegado. Se requieren permisos de administrador." 
      });
    }

    next();
  } catch (error) {
    console.error("Error en adminMiddleware:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
```

---

## 🎨 5.1 Utilidades Frontend

### 5.1.1 Configuración de Axios con Interceptores

```javascript
// frontend/src/utils/axios.js
import axios from 'axios';

// Usar la URL del backend desde variables de entorno
let API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  // En desarrollo, usar el proxy de Vite
  API_URL = '/api';
}

// Asegurar que la URL termine con /api si no lo hace (solo en producción)
if (import.meta.env.PROD && API_URL && !API_URL.endsWith('/api')) {
  API_URL = API_URL.replace(/\/$/, '') + '/api';
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 5.1.2 AuthContext de React

```javascript
// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, userId, name, role } = response.data;
      
      const userData = { userId, name, role };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al iniciar sesión' 
      };
    }
  };

  const register = async (userData) => {
    try {
      await api.post('/auth/register', userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al registrarse' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 5.1.3 Funciones de Formato de Tiempo

```javascript
// frontend/src/utils/timeUtils.js

// Formatear segundos a formato MM:SS
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Formatear tiempo restante de grabación (máximo 1 minuto)
export const formatRecordingTimeRemaining = (elapsedSeconds) => {
  const remaining = Math.max(0, 60 - elapsedSeconds); // Asegurar que no sea negativo
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};
```

### 5.1.4 Detección de Codecs para Video Multi-plataforma

```javascript
// frontend/src/utils/videoUtils.js

// Obtener el mejor codec MIME type soportado por el navegador
export const getSupportedMimeType = () => {
  // Detectar iOS/Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Codecs preferidos en orden de preferencia
  const codecs = [
    // Para iOS/Safari, preferir H.264
    { mimeType: 'video/mp4;codecs=h264,aac', isIOS: true },
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', isIOS: true },
    { mimeType: 'video/mp4', isIOS: true },
    // Para otros navegadores, preferir WebM
    { mimeType: 'video/webm;codecs=vp9,opus', isIOS: false },
    { mimeType: 'video/webm;codecs=vp8,opus', isIOS: false },
    { mimeType: 'video/webm', isIOS: false },
    // Opciones de fallback
    { mimeType: 'video/mp4', isIOS: false },
  ];
  
  // Filtrar codecs según la plataforma
  const platformCodecs = codecs.filter(c => 
    isIOS || isSafari ? c.isIOS : !c.isIOS
  );
  
  // Verificar qué codec está soportado
  for (const codec of platformCodecs) {
    if (MediaRecorder.isTypeSupported(codec.mimeType)) {
      return codec.mimeType;
    }
  }
  
  // Último recurso: usar el predeterminado (el navegador elegirá)
  return '';
};
```

### 5.1.5 Rutas Protegidas (PrivateRoute y AdminRoute)

```javascript
// frontend/src/components/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
```

```javascript
// frontend/src/components/AdminRoute.jsx
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
```

Uso en el router:

```javascript
// frontend/src/App.jsx
<Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
<Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
```

### 5.2 Exportación Excel/CSV y descarga ZIP (Admin)

**Exportar datos a Excel o CSV:**

```javascript
// backend/routes/adminRoutes.js
import * as XLSX from "xlsx";

router.get("/export-users", async (req, res) => {
  try {
    const { format = "xlsx" } = req.query; // 'xlsx' o 'csv'

    const users = await User.find({})
      .select("name email score interviewScore")
      .sort({ name: 1 });

    const exportData = users.map((user) => ({
      Nombre: user.name || "",
      Email: user.email || "",
      "Score CV": user.score ?? "N/A",
      "Score Interview": user.interviewScore ?? "N/A",
    }));

    if (format === "csv") {
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
                return `"${String(value).replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(",")
        ),
      ];
      const csv = csvRows.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="users_export_${new Date().toISOString().split("T")[0]}.csv"`);
      res.send("\ufeff" + csv); // BOM para Excel UTF-8
    } else {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="users_export_${new Date().toISOString().split("T")[0]}.xlsx"`);
      res.send(excelBuffer);
    }
  } catch (error) {
    res.status(500).json({ message: "Error exporting data" });
  }
});
```

**Descargar múltiples PDFs en un ZIP con archiver:**

```javascript
// backend/routes/adminRoutes.js
import archiver from "archiver";
import { generateAcceptanceLetterPdfBuffer } from "../utils/acceptanceLetterPdf.js";

router.post("/acceptance-letter/download-all", async (req, res) => {
  try {
    const users = await User.find({}).select("-password").lean();
    if (!users.length) return res.status(400).json({ message: "No users found." });

    const zipFilename = `acceptance_letters_${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("Archiver error:", err);
      res.status(500).end();
    });
    archive.pipe(res);

    const seenNames = new Set();
    for (const user of users) {
      try {
        const application = await Application.findOne({ userId: user._id });
        const fullName = (application?.firstName && application?.lastName
          ? `${application.firstName} ${application.lastName}`
          : user.name || "User").trim() || "User";
        const safeName = fullName.replace(/[^a-zA-Z0-9_\-\s]/g, "").replace(/\s+/g, "_") || `user_${user._id}`;
        let fileName = `Acceptance_Letter_${safeName}.pdf`;
        if (seenNames.has(fileName)) fileName = `Acceptance_Letter_${safeName}_${String(user._id).slice(-4)}.pdf`;
        seenNames.add(fileName);

        const buffer = await generateAcceptanceLetterPdfBuffer(user, application, "MIRI");
        archive.append(buffer, { name: fileName });
      } catch (err) {
        console.error(`Error for user ${user._id}:`, err);
      }
    }

    await archive.finalize();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ message: "Error generating ZIP." });
  }
});
```

**Generar PDF como Buffer (para usar en ZIP o envío por email):**

```javascript
// backend/utils/acceptanceLetterPdf.js
import PDFDocument from "pdfkit";
import { Writable } from "stream";

export function streamAcceptanceLetterPdf(res, user, application, programType) {
  const doc = new PDFDocument({ size: "A4", margins: { top: 60, bottom: 60, left: 72, right: 72 } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="Acceptance_Letter_${user.name}.pdf"`);
  doc.pipe(res);
  // ... doc.text(), doc.image(), etc.
  doc.end();
}

export function generateAcceptanceLetterPdfBuffer(user, application, programType) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const writable = new Writable({
      write(chunk, enc, cb) {
        chunks.push(chunk);
        cb();
      },
      final(cb) {
        resolve(Buffer.concat(chunks));
        cb();
      },
    });
    writable.setHeader = () => {};
    try {
      streamAcceptanceLetterPdf(writable, user, application, programType);
    } catch (e) {
      reject(e);
    }
  });
}
```

---

## 📧 6. Sistema de Email

```javascript
// backend/config/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Recuperación de Contraseña',
      html: `
        <div>
          <h2>Recuperación de Contraseña</h2>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
          <a href="${resetUrl}">Restablecer Contraseña</a>
          <p>Este enlace expirará en 1 hora.</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error enviando email:', error);
    return { success: false, error: error.message };
  }
};
```

### 6.1 Envío de email masivo por lotes (BCC)

Útil para notificar a muchos usuarios sin exponer las direcciones. Se envían en lotes con un pequeño delay para evitar rate limiting (p. ej. Gmail).

```javascript
// backend/config/email.js
export const sendBulkEmailToActiveUsers = async (userEmails, subject, htmlContent, textContent) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const batchSize = 10;
    const results = { success: [], failed: [] };

    for (let i = 0; i < userEmails.length; i += batchSize) {
      const batch = userEmails.slice(i, i + batchSize);

      const mailOptions = {
        from: `"Your App" <${process.env.EMAIL_USER}>`,
        bcc: batch, // BCC: cada destinatario recibe sin ver a los demás
        replyTo: process.env.EMAIL_USER,
        subject,
        text: textContent,
        html: htmlContent,
        headers: { 'X-Priority': '1', 'X-MSMail-Priority': 'High', 'Importance': 'high' },
      };

      try {
        const result = await transporter.sendMail(mailOptions);
        batch.forEach((email) => results.success.push({ email, messageId: result.messageId }));
        if (i + batchSize < userEmails.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s entre lotes
        }
      } catch (error) {
        batch.forEach((email) => results.failed.push({ email, error: error.message }));
      }
    }

    return {
      success: true,
      totalSent: results.success.length,
      totalFailed: results.failed.length,
      results,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

---

## 🚀 7. Configuración del Servidor Express

```javascript
// backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

dotenv.config();

const app = express();
app.use(express.json());

// CORS
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : [];

const corsOptions = {
  origin: allowedOrigins,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};

app.use(cors(corsOptions));

// Conectar DB
connectDB();

// Rutas
import { authRoutes } from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 20352;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## 📝 8. Ejemplo de Uso Completo

### Flujo Completo de Usuario:

```javascript
// 1. Registro
POST /api/auth/register
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "dob": "2000-01-01",
  "gender": "Masculino",
  "academic_level": "Superior"
}

// 2. Login
POST /api/auth/login
{
  "email": "juan@example.com",
  "password": "password123"
}
// Respuesta: { token, userId, name, role }

// 3. Subir CV (con token en header)
POST /api/users/upload-cv
Headers: { Authorization: "Bearer <token>" }
Body: FormData con archivo PDF

// 4. Analizar CV
POST /api/users/analyze-cv
Headers: { Authorization: "Bearer <token>" }
// Respuesta: { questions, score }

// 5. Enviar respuestas de entrevista
POST /api/users/submit-interview
Headers: { Authorization: "Bearer <token>" }
{
  "answers": ["respuesta1", "respuesta2", ...]
}

// 6. Enviar cuestionario de habilidades blandas
POST /api/users/submit-soft-skills
Headers: { Authorization: "Bearer <token>" }
{
  "responses": { "1": "5", "2": "4", ... }
}
```

---

## 🔑 9. Variables de Entorno Mínimas

```env
# .env
MONGO_URI=mongodb://localhost:27017/your_database
JWT_SECRET=your_secret_key_here
PORT=3000
CORS_ORIGINS=http://localhost:3000

# Almacenamiento de archivos: 'local' (disco) o 's3'
STORAGE_TYPE=local

# AWS S3 (para CVs, fotos, videos, comprobantes)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BUCKET_NAME=your_bucket

# OpenAI (para análisis)
OPENAI_API_KEY=your_openai_key

# Email (opcional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3000

# Eleven Labs - Text to Speech (opcional pero recomendado)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

---

## ✅ Checklist de Implementación

- [ ] Configurar MongoDB y conexión
- [ ] Crear modelo de Usuario
- [ ] Implementar registro y login
- [ ] Configurar JWT y middleware de autenticación
- [ ] Configurar AWS S3 para subida de archivos
- [ ] Implementar Multer con almacenamiento local o S3 (STORAGE_TYPE)
- [ ] Implementar extracción de texto de PDF
- [ ] Configurar OpenAI API
- [ ] Implementar análisis de CV
- [ ] Implementar generación de preguntas
- [ ] Implementar evaluación de entrevista
- [ ] Crear funciones de evaluación de cuestionarios
- [ ] Implementar endpoints de cuestionarios
- [ ] Configurar sistema de email (opcional)
- [ ] Implementar envío de email masivo por lotes (BCC)
- [ ] Implementar middleware de admin
- [ ] Crear panel de administración
- [ ] Implementar PrivateRoute y AdminRoute en React
- [ ] Exportación a Excel/CSV (XLSX) desde admin
- [ ] Descarga masiva en ZIP (archiver) y generación de PDF como Buffer
- [ ] Configurar ElevenLabs TTS (opcional pero recomendado)
- [ ] Implementar sistema de guardado automático de progreso
- [ ] Configurar transcripción de video con Whisper
- [ ] Implementar funciones de formato de tiempo
- [ ] Configurar detección de codecs multi-plataforma
- [ ] Crear AuthContext de React
- [ ] Configurar axios con interceptores
- [ ] Implementar función de normalización de habilidades
- [ ] Implementar filtro de alucinaciones de Whisper
- [ ] Implementar generación de Digital ID único
- [ ] Configurar presigned URLs para S3
- [ ] Implementar verificación de archivos en S3
- [ ] Implementar validación de edad
- [ ] Implementar normalización de email
- [ ] Crear función de formateo de markdown a HTML
- [ ] Implementar funciones de formateo de fechas y fecha con sufijo ordinal
- [ ] Implementar utilidades de escape HTML
- [ ] Implementar detección de extensión de archivo
- [ ] Implementar guardado de borrador con findOneAndUpdate (upsert)

---

## 🔧 10. Funciones de Utilidad Reutilizables

### 10.1 Normalización de Nombres de Habilidades

```javascript
// backend/utils/cvUtils.js
function normalizeSkillName(skill) {
  if (!skill || typeof skill !== 'string') return null;
  
  // Remover caracteres especiales y espacios extra
  let normalized = skill
    .trim()
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/[-•]\s*/g, '') // Remove bullets
    .replace(/\n/g, ' ') // Replace newlines
    .replace(/\s+/g, ' ') // Multiple spaces to one
    .trim();
  
  // Normalizar nombres comunes de habilidades
  const skillNormalizations = {
    // Programming languages
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'c++': 'C++',
    'c#': 'C#',
    '.net': '.NET',
    'ai/ml': 'Machine Learning',
    'ml': 'Machine Learning',
    'ai': 'Artificial Intelligence',
    
    // Soft skills
    'team work': 'Teamwork',
    'team-work': 'Teamwork',
    'project management': 'Project Management',
    'time management': 'Time Management',
    'problem solving': 'Problem Solving',
    'critical thinking': 'Critical Thinking',
    'communication skills': 'Communication',
    'public speaking': 'Public Speaking',
    
    // Technical skills
    'cad': 'CAD',
    'solidworks': 'SolidWorks',
    'fusion 360': 'Fusion 360',
    'web development': 'Web Development',
    'mobile development': 'Mobile Development',
  };
  
  const lowerSkill = normalized.toLowerCase();
  if (skillNormalizations[lowerSkill]) {
    normalized = skillNormalizations[lowerSkill];
  }
  
  // Capitalizar primera letra de cada palabra (Title Case)
  normalized = normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Validar que sea una habilidad válida
  if (normalized.length < 2 || normalized.length > 50) {
    return null;
  }
  
  return normalized;
}
```

### 10.2 Filtro de Alucinaciones de Whisper

```javascript
// backend/utils/cvUtils.js
function filterWhisperHallucinations(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Lista de frases basura comunes que Whisper genera
  const hallucinationPatterns = [
    // Frases sobre subtítulos y transcripciones
    /subtitle\s+by/i,
    /subtitle/i,
    /transcribed\s+by/i,
    /transcription\s+by/i,
    /caption\s+by/i,
    /caption/i,
    
    // Frases sobre el hablante
    /the\s+speaker\s+is/i,
    /speaker\s+is\s+answering/i,
    /the\s+speaker\s+is\s+answering\s+questions/i,
    /speaker\s+is\s+answering\s+questions\s+in\s+english/i,
    
    // Frases sobre idioma
    /answering\s+questions\s+in\s+english/i,
    /speaking\s+in\s+english/i,
    /the\s+language\s+is/i,
    
    // Frases genéricas de relleno
    /thank\s+you\s+for\s+watching/i,
    /please\s+subscribe/i,
    /like\s+and\s+subscribe/i,
    /don't\s+forget\s+to\s+subscribe/i,
    
    // Frases sobre silencio o ruido
    /background\s+noise/i,
    /silence/i,
    /no\s+audio/i,
    /audio\s+unavailable/i,
  ];

  // Dividir el texto en líneas o frases
  let filteredText = text;
  
  // Eliminar líneas completas que coincidan con patrones de alucinación
  const lines = filteredText.split(/\n|\./).filter(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return false; // Eliminar líneas vacías
    
    // Verificar si la línea completa es una alucinación
    for (const pattern of hallucinationPatterns) {
      if (pattern.test(trimmedLine)) {
        return false; // Eliminar esta línea
      }
    }
    
    // Si la línea es muy corta (menos de 3 caracteres), eliminarla
    if (trimmedLine.length < 3) {
      return false;
    }
    
    return true;
  });

  // Reconstruir el texto sin las líneas eliminadas
  filteredText = lines.join('. ').trim();
  
  // Eliminar patrones que aparezcan dentro del texto
  for (const pattern of hallucinationPatterns) {
    filteredText = filteredText.replace(pattern, '').trim();
  }
  
  // Limpiar espacios múltiples y puntuación duplicada
  filteredText = filteredText.replace(/\s+/g, ' ').trim();
  filteredText = filteredText.replace(/\.{2,}/g, '.').trim();
  
  return filteredText;
}
```

### 10.3 Generación de Digital ID Único

```javascript
// backend/routes/authRoutes.js
async function generateDigitalId(program) {
  const currentYear = new Date().getFullYear();
  const programCode = program.toUpperCase(); // Asegurar mayúsculas
  
  // Contar cuántos usuarios hay con este programa en este año
  const usersInProgramThisYear = await User.countDocuments({
    program: programCode,
    createdAt: {
      $gte: new Date(currentYear, 0, 1), // Desde el 1 de enero del año actual
      $lt: new Date(currentYear + 1, 0, 1) // Hasta el 1 de enero del año siguiente
    }
  });
  
  // El siguiente número será el contador + 1
  const userNumber = usersInProgramThisYear + 1;
  const digitalId = `${programCode}-${currentYear}-${userNumber}`;
  
  return digitalId;
}

// Uso en registro:
const digitalId = await generateDigitalId(program);
user.digitalId = digitalId;
```

### 10.4 Generación de Presigned URLs para S3

```javascript
// backend/routes/userRoutes.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

router.post("/get-upload-url", authMiddleware, async (req, res) => {
  try {
    const { fileName, contentType } = req.body;
    
    if (!fileName || !contentType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'fileName and contentType are required'
      });
    }

    // Validate content type
    if (!contentType.startsWith('video/')) {
      return res.status(400).json({ 
        error: 'Invalid content type',
        message: 'Only video files are allowed'
      });
    }

    // Determine file extension
    let extension = 'webm';
    if (contentType.includes('mp4')) {
      extension = 'mp4';
    } else if (contentType.includes('quicktime') || contentType.includes('mov')) {
      extension = 'mov';
    } else if (contentType.includes('webm')) {
      extension = 'webm';
    }

    // Generate S3 key
    const s3Key = `videos/interview_${Date.now()}_${req.userId || 'unknown'}.${extension}`;

    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Create PutObject command
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
      ACL: 'public-read', // Make the file publicly readable
    });

    // Generate presigned URL (valid for 15 minutes)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    // Generate the public URL where the file will be accessible
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    res.json({
      uploadUrl: presignedUrl,
      s3Key: s3Key,
      publicUrl: publicUrl,
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to generate upload URL',
      message: error.message 
    });
  }
});
```

### 10.5 Verificación de Archivos en S3

```javascript
// backend/routes/userRoutes.js
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

router.get("/verify-file-exists", authMiddleware, async (req, res) => {
  try {
    const { s3Key } = req.query;
    
    if (!s3Key) {
      return res.status(400).json({ 
        error: 'Missing s3Key parameter'
      });
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    const headCommand = new HeadObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
    });
    
    try {
      await s3Client.send(headCommand);
      // File exists
      res.json({ exists: true, message: 'File exists in S3' });
    } catch (s3Error) {
      // File doesn't exist or not accessible
      if (s3Error.name === 'NotFound' || s3Error.$metadata?.httpStatusCode === 404) {
        res.json({ exists: false, message: 'File not found in S3' });
      } else {
        throw s3Error;
      }
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to verify file',
      message: error.message 
    });
  }
});
```

### 10.6 Validación de Edad

```javascript
// backend/routes/authRoutes.js
function validateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  
  // Validate date is valid
  if (isNaN(birthDate.getTime())) {
    return { valid: false, error: "Invalid date of birth. Please enter a valid date." };
  }
  
  // Validate date is not in the future
  if (birthDate > today) {
    return { valid: false, error: "Date of birth cannot be in the future." };
  }
  
  // Validate date is reasonable (not before 1900)
  const minYear = 1900;
  if (birthDate.getFullYear() < minYear) {
    return { valid: false, error: "Date of birth must be after 1900." };
  }
  
  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  // Validate age is reasonable (not more than 120 years)
  if (age > 120) {
    return { valid: false, error: "Please enter a valid date of birth." };
  }
  
  // Validate age requirement (must be at least 17 years old)
  if (age < 17) {
    return { valid: false, error: "You must be at least 17 years old to register." };
  }
  
  return { valid: true, age };
}

// Uso:
const validation = validateAge(dob);
if (!validation.valid) {
  return res.status(400).json({ message: validation.error });
}
```

### 10.7 Normalización de Email

```javascript
// backend/routes/authRoutes.js
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  return String(email).toLowerCase().trim();
}

// Uso:
const normalizedEmail = normalizeEmail(email);
const exists = await User.findOne({ email: normalizedEmail });
```

### 10.8 Formateo de Markdown a HTML (Frontend)

```javascript
// frontend/src/utils/markdownUtils.js
export const formatMarkdown = (text) => {
  if (!text) return '';
  
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  let listItems = [];
  let currentParagraph = [];
  
  const closeList = () => {
    if (inList && listItems.length > 0) {
      html += '<ul class="list-disc list-inside space-y-1 my-3 ml-4">';
      listItems.forEach(item => {
        html += `<li class="mb-1">${item}</li>`;
      });
      html += '</ul>';
      listItems = [];
      inList = false;
    }
  };
  
  const closeParagraph = () => {
    if (currentParagraph.length > 0) {
      let content = currentParagraph.join(' ').trim();
      // Procesar negritas
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
      if (content) {
        html += `<p class="mb-3">${content}</p>`;
      }
      currentParagraph = [];
    }
  };
  
  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Línea vacía - cerrar lista y párrafo
    if (!trimmed) {
      closeList();
      closeParagraph();
      return;
    }
    
    // Encabezados ###
    if (trimmed.startsWith('### ')) {
      closeList();
      closeParagraph();
      const content = trimmed.substring(4).trim();
      html += `<h3 class="text-lg font-bold text-gray-900 mt-4 mb-2">${content}</h3>`;
      return;
    }
    
    // Encabezados ####
    if (trimmed.startsWith('#### ')) {
      closeList();
      closeParagraph();
      const content = trimmed.substring(5).trim();
      html += `<h4 class="text-base font-semibold text-gray-800 mt-3 mb-2">${content}</h4>`;
      return;
    }
    
    // Lista con -
    if (trimmed.startsWith('- ')) {
      closeParagraph();
      if (!inList) {
        closeList();
        inList = true;
      }
      let content = trimmed.substring(2).trim();
      // Procesar negritas dentro de la lista
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
      listItems.push(content);
      return;
    }
    
    // Lista numerada 1. 2. etc.
    const numberedMatch = trimmed.match(/^\d+\. (.+)$/);
    if (numberedMatch) {
      closeParagraph();
      if (!inList) {
        closeList();
        inList = true;
      }
      let content = numberedMatch[1].trim();
      // Procesar negritas dentro de la lista
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
      listItems.push(content);
      return;
    }
    
    // Párrafo normal - acumular líneas
    closeList();
    currentParagraph.push(trimmed);
  });
  
  // Cerrar lista y párrafo si quedan abiertos al final
  closeList();
  closeParagraph();
  
  return html;
};

// Uso en React:
<div dangerouslySetInnerHTML={{ __html: formatMarkdown(markdownText) }} />
```

### 10.9 Formateo de Fechas (Frontend)

```javascript
// frontend/src/utils/dateUtils.js
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Formato corto (solo fecha)
export const formatDateShort = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Formato relativo (hace X tiempo)
export const formatDateRelative = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDateShort(dateString);
};
```

### 10.10 Utilidades de HTML (Backend)

```javascript
// backend/config/email.js
// Helper function to escape HTML characters
export const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Helper function to convert newlines to <br> tags
export const nl2br = (text) => {
  if (!text) return '';
  return String(text).replace(/\n/g, '<br>');
};

// Helper function to sanitize user input
export const sanitizeInput = (input) => {
  if (!input) return '';
  return escapeHtml(String(input).trim());
};
```

### 10.11 Detección de Extensión de Archivo desde Content-Type

```javascript
// backend/routes/userRoutes.js
function getFileExtensionFromContentType(contentType) {
  if (!contentType || typeof contentType !== 'string') {
    return 'bin'; // Default extension
  }
  
  const contentTypeMap = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  
  // Check exact match first
  if (contentTypeMap[contentType]) {
    return contentTypeMap[contentType];
  }
  
  // Check if content type includes known extensions
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('webm')) return 'webm';
  if (contentType.includes('quicktime') || contentType.includes('mov')) return 'mov';
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('webp')) return 'webp';
  
  // Default fallback
  return 'bin';
}

// Uso:
const extension = getFileExtensionFromContentType(req.body.contentType);
const fileName = `file_${Date.now()}.${extension}`;
```

### 10.12 Formateo de fecha con sufijo ordinal (1st, 2nd, 3rd)

Útil para cartas formales, facturas o textos en inglés.

```javascript
// backend/utils/invoicePdf.js o similar
function formatDateWithOrdinal(d) {
  if (!d) return "—";
  const date = new Date(d);
  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31 ? "st" :
    day === 2 || day === 22 ? "nd" :
    day === 3 || day === 23 ? "rd" : "th";
  return date
    .toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    .replace(/\d+/, day + suffix);
}

// Ejemplo: "March 4th, 2026"
```

### 10.13 Guardar borrador con findOneAndUpdate (upsert)

Patrón para formularios multi-paso: guardar borrador sin validación estricta y sobrescribir solo los campos enviados. El email se fuerza desde el usuario autenticado.

```javascript
// backend/routes/applicationRoutes.js
router.put("/save", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const applicationData = {
      userId: req.userId,
      email: user.email,
      ...req.body,
      email: user.email, // Siempre desde auth
      isDraft: true,
      lastSavedAt: new Date(),
    };

    // No guardar flags de paso completado en borrador
    delete applicationData.step1Completed;
    delete applicationData.step2Completed;
    delete applicationData.step3Completed;
    delete applicationData.step4Completed;

    const application = await Application.findOneAndUpdate(
      { userId: req.userId },
      applicationData,
      { new: true, upsert: true, runValidators: false }
    );

    res.json({ message: "Draft saved successfully", application });
  } catch (error) {
    res.status(500).json({ message: "Error saving draft", error: error.message });
  }
});
```

---

Estos ejemplos proporcionan una base sólida para implementar todas las funcionalidades principales en tu nuevo proyecto.

