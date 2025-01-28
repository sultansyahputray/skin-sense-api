const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const firebase = require("firebase/app");
const multer = require('multer');
const uuid = require('uuid');
const { FieldValue } = require('firebase-admin/firestore');
const { error } = require("console");
const predictClassification = require('./inferenceService'); 

require('dotenv').config();

const firebaseConfig = {
  apiKey: "AIzaSyDaMlyw3dNOam6sj4zcIlXgvr4_1eyYlHI",
  authDomain: "fir-crud-api-d0d45.firebaseapp.com",
  projectId: "fir-crud-api-d0d45",
  storageBucket: "fir-crud-api-d0d45.firebasestorage.app",
  messagingSenderId: "987238246874",
  appId: "1:987238246874:web:8c39bfb70b4ff48560f8e3"
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Inisialization Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require('./permission-skin.json')),
  storageBucket: 'scanned-images-bucket',
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Konfiguration Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('file');

// Sending OTP
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for Registration",
    text: `Your OTP is: ${otp}`,
  };

  await transporter.sendMail(mailOptions);
};

// Registrasi
const registerUser = async (req, h) => {
  const { email, password, name } = req.payload;

  if (!email || !password || !name) {
    return h.response({ error: "Email, password, and name are required" }).code(400);
  }

  try {
    const userRef = db.collection("users").where("email", "==", email);
    const snapshot = await userRef.get();

    if (!snapshot.empty) {
      return h.response({ error: "Email already registered" }).code(400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    await sendOTPEmail(email, otp);

    const hashedPassword = await bcrypt.hash(password, 10);

    const otpData = {
      email,
      password: hashedPassword,
      name,
      otp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("otp_verification").doc(email).set(otpData);

    return h.response({ message: "OTP sent to email" }).code(200);
  } catch (error) {
    console.error("Error during registration:", error);
    return h.response({ error: "Failed to register user" }).code(500);
  }
};

// OTP verification
const verifyOTP = async (req, h) => {
  const { email, otp } = req.payload;

  if (!email || !otp) {
    return h.response({ error: "Email and OTP are required" }).code(400);
  }

  try {
    const otpDoc = await db.collection("otp_verification").doc(email).get();

    if (!otpDoc.exists || otpDoc.data().otp !== parseInt(otp)) {
      return h.response({ error: "Invalid OTP or email" }).code(400);
    }

    const data = otpDoc.data();

    await db.collection("users").doc(email).set({
      name: data.name,
      email: data.email,
      password: data.password,
      createdAt: data.createdAt,
    });

    await db.collection("otp_verification").doc(email).delete();

    return h.response({ message: "Registration successful" }).code(200);
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return h.response({ error: "Failed to verify OTP" }).code(500);
  }
};

// Login
const loginUser = async (req, h) => {
  const { email, password } = req.payload;

  if (!email || !password) {
    return h.response({ error: "Email and password are required" }).code(400);
  }

  try {
    const userRef = db.collection("users").where("email", "==", email);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
      return h.response({ error: "User not found" }).code(400);
    }

    const user = snapshot.docs[0].data();

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return h.response({ error: "Invalid email or password" }).code(400);
    }

    return h.response({ message: "Login successful", user: { name: user.name, email: user.email } }).code(200);
  } catch (error) {
    console.error("Error logging in:", error);
    return h.response({ error: "Failed to login user" }).code(500);
  }
};

// Add skin info for each user
const addSkinHealthDataForUser = async (req, h) => {
  const {
    gender,
    age,
    skinCondition,
    sensitiveSkin,
    symptomStart,
    worstSymptom,
    skinDiseaseHistory,
    geneticSkinDisease,
    skinMedicationHistory,
    detailedDescription,
  } = req.payload;

  const { userId } = req.params;

  if (
    !userId ||
    !gender ||
    !age ||
    !skinCondition ||
    !sensitiveSkin ||
    !symptomStart ||
    !worstSymptom ||
    !skinDiseaseHistory ||
    !geneticSkinDisease ||
    !skinMedicationHistory ||
    !detailedDescription
  ) {
    return h.response({ error: 'All fields are required and userId must be provided' }).code(400);
  }

  try {
    const newSkinHealthRecord = {
      gender,
      age,
      skinCondition,
      sensitiveSkin,
      symptomStart,
      worstSymptom,
      skinDiseaseHistory,
      geneticSkinDisease,
      skinMedicationHistory,
      detailedDescription,
      createdAt: new Date().toISOString(),
    };

    const userRef = db.collection('users').doc(userId);
    await userRef.collection('skin_health').add(newSkinHealthRecord);

    return h.response({
      message: 'Skin health data saved successfully for user',
      userId,
    }).code(201);
  } catch (error) {
    console.error('Error saving skin health data for user:', error);
    return h.response({ error: 'Failed to save skin health data for user' }).code(500);
  }
};

// Get user skin information
const getSkinHealthDataForUser = async (req, h) => {
  const { userId } = req.params;

  if (!userId) {
    return h.response({ error: 'userId is required' }).code(400);
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const snapshot = await userRef.collection('skin_health').get();

    if (snapshot.empty) {
      return h.response({ message: 'No skin health history found for this user' }).code(404);
    }

    let history = [];
    snapshot.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });

    return h.response({
      message: 'Skin health history retrieved successfully',
      history,
    }).code(200);
  } catch (error) {
    console.error('Error retrieving skin health history for user:', error);
    return h.response({ error: 'Failed to retrieve skin health history for user' }).code(500);
  }
};

// reset password
const requestPasswordReset = async (req, h) => {
  const { email } = req.payload;

  if (!email) {
    return h.response({ error: 'Email is required' }).code(400);
  }

  try {
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return h.response({ error: 'User not found' }).code(404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    await userRef.update({ resetToken });

    // Sending email for token
    const resetLink = `http://web.com/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset',
      text: `Click the link to reset your password: ${resetLink}`,
    };

    await transporter.sendMail(mailOptions);

    return h.response({ message: 'Password reset email sent' }).code(200);
  } catch (error) {
    console.error('Error resetting password:', error);
    return h.response({ error: 'Failed to reset password' }).code(500);
  }
};

// confirm token for reset password
const confirmPasswordReset = async (req, h) => {
  const { token, newPassword } = req.payload;

  if (!token || !newPassword) {
    return h.response({ error: 'Token and new password are required' }).code(400);
  }

  try {
    const userRef = db.collection('users').where('resetToken', '==', token);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
      return h.response({ error: 'Invalid token' }).code(400);
    }

    const userDoc = snapshot.docs[0].ref;

    const hashedPassword = await bcrypt.hash(newPassword, 8);

    await userDoc.update({
      password: hashedPassword,
      resetToken: FieldValue.delete(), 
    });

    return h.response({ message: 'Password reset successful' }).code(200);
  } catch (error) {
    console.error('Error confirming password reset:', error);
    return h.response({ error: 'Failed to confirm password reset' }).code(500);
  }
};

// Upload image
const uploadImage = async (req, h) => {
  try {
    const { file, userId } = req.payload;

    if (!file) {
      console.error('File not found in payload');
      return h.response({ error: 'No file uploaded' }).code(400);
    }

    if (!userId) {
      console.error('User ID not provided');
      return h.response({ error: 'User ID is required' }).code(400);
    }

    console.log('File details:', {
      filename: file.hapi.filename,
      mimeType: file.hapi.headers['content-type'],
    });

    // Sanitizing the filename: replace spaces with hyphens
    const sanitizedFileName = file.hapi.filename.replace(/\s+/g, '-');
    const fileName = `${uuid.v4()}_${sanitizedFileName}`;
    const filePath = `images/${userId}/${fileName}`; 
    const blob = bucket.file(filePath);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.hapi.headers['content-type'],
      },
    });

    console.log('Starting file upload...');

    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('Error during file upload:', err);
        reject(h.response({ error: 'Failed to upload file' }).code(500));
      });

      blobStream.on('finish', async () => {
        console.log('File upload finished');

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        console.log('Public URL generated:', publicUrl);

        const imageMetadata = {
          fileName,
          url: publicUrl,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Simpan metadata ke koleksi berdasarkan userId
        await db.collection(`users/${userId}/images`).add(imageMetadata);
        console.log('Metadata saved to Firestore for user:', userId);

        resolve(
          h.response({
            message: 'Image uploaded successfully',
            url: publicUrl,
          }).code(200)
        );
      });

      blobStream.end(file._data);
    });
  } catch (error) {
    console.error('Error in uploadImage handler:', error);
    return h.response({ error: 'Something went wrong' }).code(500);
  }
};

// Handler untuk mengambil gambar terbaru
const getLatestImage = async (req, h) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      console.error('User ID not provided');
      return h.response({ error: 'User ID is required' }).code(400);
    }

    const snapshot = await db
      .collection(`users/${userId}/images`)
      .orderBy('uploadedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return h.response({ message: 'No images found for this user' }).code(404);
    }

    const latestImageDoc = snapshot.docs[0].data();

    return h.response({
      message: 'Latest image retrieved successfully',
      image: latestImageDoc,
    }).code(200);
  } catch (error) {
    console.error('Error fetching latest image:', error);
    return h.response({ error: 'Failed to retrieve latest image' }).code(500);
  }
};

// Save disease history for a user
const saveDiseaseHistory = async (req, h) => {
  try {
    const { userId, diseaseName, diseaseDescription, solution } = req.payload;

    if (!userId) {
      console.error('User ID not provided');
      return h.response({ error: 'User ID is required' }).code(400);
    }

    if (!diseaseName || !diseaseDescription || !solution) {
      console.error('Incomplete disease data');
      return h.response({
        error: 'Disease name, description, and solution are required',
      }).code(400);
    }

    const snapshot = await db
      .collection(`users/${userId}/images`)
      .orderBy('uploadedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.error('No recent images found for this user');
      return h.response({ error: 'No recent images found' }).code(404);
    }

    const latestImageDoc = snapshot.docs[0].data();
    const latestImageUrl = latestImageDoc.url;

    const historyData = {
      diseaseName,
      diseaseDescription,
      solution,
      imageUrl: latestImageUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(`users/${userId}/history`).add(historyData);
    console.log(`Disease history saved for user: ${userId}`);

    return h.response({
      message: 'Disease history saved successfully',
      data: historyData,
    }).code(200);
  } catch (error) {
    console.error('Error saving disease history:', error);
    return h.response({ error: 'Failed to save disease history' }).code(500);
  }
};

// Get all user disease history
const getDiseaseHistory = async (req, h) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      console.error('User ID not provided');
      return h.response({ error: 'User ID is required' }).code(400);
    }

    const snapshot = await db.collection(`users/${userId}/history`).get();

    if (snapshot.empty) {
      return h.response({ message: 'No disease history found for this user' }).code(404);
    }

    const history = [];
    snapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() });
    });

    return h.response({
      message: 'Disease history retrieved successfully',
      history,
    }).code(200);
  } catch (error) {
    console.error('Error fetching disease history:', error);
    return h.response({ error: 'Failed to retrieve disease history' }).code(500);
  }
};

// Store data prediction to fire store
const storeData = async (userId, data) => {
  try {
    const userPredictionCollection = db.collection(`users/${userId}/predictions`);
    await userPredictionCollection.add(data);
    console.log(`Prediction data successfully stored for user ${userId}.`);
    return { success: true, message: `Prediction data successfully stored for user ${userId}.` };
  } catch (error) {
    console.error(`Error storing prediction data for user ${userId}:`, error);
    return { success: false, error: `Failed to store prediction data for user ${userId}.` };
  }
};

// Prediction diseases 
const postPredictHandler = async (req, h) => {
  const { file } = req.payload; 
  const { model } = req.server.app; 

  if (!file) {
    return h.response({ error: "File gambar diperlukan untuk prediksi" }).code(400);
  }

  try {
    const { confidenceScore, label, explanation, suggestion } = await predictClassification(model, file);

    const id = crypto.randomUUID();
    const createdAt = admin.firestore.FieldValue.serverTimestamp();

    const data = {
      id,
      result: label,
      explanation,
      suggestion,
      confidenceScore,
      createdAt
    };

    // Simpan data 
    await storeData(id, data, 'predictions'); 

    const response = h.response({
      status: 'success',
      message: confidenceScore > 99 
        ? 'Model berhasil diprediksi.' 
        : 'Model berhasil diprediksi, tetapi tingkat kepercayaan di bawah ambang batas. Harap gunakan gambar yang tepat.',
      data
    });

    response.code(201);
    return response;

  } catch (error) {
    console.error('Error during prediction:', error);
    return h.response({ error: 'Gagal memprediksi gambar' }).code(500);
  }
};

// Prediction and upload image 
const postPredictAndUploadHandler = async (req, h) => {
  const { file, userId } = req.payload;
  const { model } = req.server.app;

  if (!file) {
    return h.response({ error: "File gambar diperlukan untuk prediksi" }).code(400);
  }

  if (!userId) {
    return h.response({ error: "User ID diperlukan untuk proses ini" }).code(400);
  }

  try {
    const fileBuffer = file._data;
    const { confidenceScore, label, explanation, suggestion } = await predictClassification(model, fileBuffer);

    const uploadResult = await uploadImage({ payload: { file, userId } }, h);

    const publicUrl = uploadResult.source.url;

    const predictionId = crypto.randomUUID();
    const createdAt = admin.firestore.FieldValue.serverTimestamp();

    const predictionData = {
      id: predictionId,
      userId: userId,
      result: label,
      explanation,
      suggestion,
      confidenceScore,
      imageUrl: publicUrl,
      createdAt,
    };

    await storeData(userId, predictionData, 'predictions');
    console.log("Prediction result and image URL saved to Firestore:", predictionData);

    return h.response({
      status: 'success',
      message: confidenceScore > 99 
        ? "Prediksi berhasil dan gambar berhasil diunggah."
        : "Prediksi berhasil, tetapi tingkat kepercayaan rendah. Gambar berhasil diunggah.",
      prediction: predictionData,
      image: { url: publicUrl },
    }).code(201);
  } catch (error) {
    console.error("Error in postPredictAndUploadHandler:", error);
    return h.response({ error: "Terjadi kesalahan selama proses prediksi dan unggah." }).code(500);
  }
};

// Get prediction data for a specific user
const getPredictionsHandler = async (req, h) => {
  const { userId } = req.params; 

  if (!userId) {
    return h.response({ error: "User ID diperlukan untuk mendapatkan data prediksi." }).code(400);
  }

  try {
    const predictionsRef = db.collection(`users/${userId}/predictions`);
    const snapshot = await predictionsRef.get();

    if (snapshot.empty) {
      return h.response({
        status: 'success',
        message: `Tidak ada data prediksi untuk user ID: ${userId}.`,
        data: [],
      }).code(200);
    }

    const predictions = [];
    snapshot.forEach((doc) => {
      predictions.push({ id: doc.id, ...doc.data() });
    });

    return h.response({
      status: 'success',
      message: `Data prediksi berhasil diambil untuk user ID: ${userId}.`,
      data: predictions,
    }).code(200);
  } catch (error) {
    console.error("Error getting prediction data:", error);
    return h.response({ error: "Gagal mengambil data prediksi." }).code(500);
  }
};

module.exports = {
  registerUser,
  verifyOTP,
  loginUser,
  addSkinHealthDataForUser,
  getSkinHealthDataForUser,
  requestPasswordReset,
  confirmPasswordReset,
  uploadImage,
  getLatestImage,
  saveDiseaseHistory,
  getDiseaseHistory,
  postPredictHandler,
  postPredictAndUploadHandler,
  getPredictionsHandler,
};

