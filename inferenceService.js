const tf = require('@tensorflow/tfjs-node');

async function predictClassification(model, image) {
  const tensor = tf.node
    .decodeJpeg(image)
    .resizeNearestNeighbor([224, 224])
    .expandDims() 
    .toFloat(); 

  // Lakukan prediksi
  const prediction = model.predict(tensor);
  const score = await prediction.data(); 
  const confidenceScore = Math.max(...score) * 100; 

  const classes = [
    'cellulitis',
    'impetigo',
    'athlete-foot',
    'nail-fungus',
    'ringworm',
    'cutaneous-larva-migrans',
    'chickenpox',
    'shingles',
  ];

  // Tentukan kelas hasil prediksi
  const classResult = tf.argMax(prediction, 1).dataSync()[0];
  const label = classes[classResult];

  // Penjelasan dan solusi untuk masing-masing kelas
  let explanation = '';
  let suggestion = '';

  switch (label) {
    case 'cellulitis':
      explanation = "Cellulitis adalah infeksi bakteri yang menyebabkan kulit menjadi merah, bengkak, dan terasa nyeri.";
      suggestion = "Segera konsultasikan dengan dokter untuk mendapatkan antibiotik yang sesuai.";
      break;

    case 'impetigo':
      explanation = "Impetigo adalah infeksi kulit menular yang sering terjadi pada anak-anak, ditandai dengan luka atau lepuhan kecil.";
      suggestion = "Hindari kontak langsung dengan orang lain dan gunakan salep antibiotik seperti yang direkomendasikan oleh dokter.";
      break;

    case 'athlete-foot':
      explanation = "Athlete's foot adalah infeksi jamur yang biasanya menyerang kulit di antara jari-jari kaki.";
      suggestion = "Gunakan obat antijamur topikal dan jaga kaki tetap kering serta bersih.";
      break;

    case 'nail-fungus':
      explanation = "Infeksi jamur kuku menyebabkan kuku menjadi tebal, rapuh, dan berubah warna.";
      suggestion = "Gunakan obat antijamur topikal atau oral sesuai saran dokter.";
      break;

    case 'ringworm':
      explanation = "Ringworm adalah infeksi jamur yang menyebabkan ruam melingkar dengan tepi yang merah dan bersisik.";
      suggestion = "Hindari kontak langsung dengan orang lain dan gunakan obat antijamur sesuai petunjuk dokter.";
      break;

    case 'cutaneous-larva-migrans':
      explanation = "Cutaneous larva migrans adalah infeksi kulit yang disebabkan oleh larva cacing tambang, sering ditemukan di daerah tropis.";
      suggestion = "Hindari berjalan tanpa alas kaki di pasir atau tanah dan segera konsultasikan ke dokter untuk pengobatan.";
      break;

    case 'chickenpox':
      explanation = "Chickenpox (cacar air) adalah infeksi virus yang menyebabkan ruam berisi cairan dan sangat menular.";
      suggestion = "Istirahat, hindari kontak dengan orang lain, dan gunakan obat antipruritus untuk mengurangi rasa gatal.";
      break;

    case 'shingles':
      explanation = "Shingles (herpes zoster) adalah reaktivasi virus cacar air yang menyebabkan ruam menyakitkan.";
      suggestion = "Segera konsultasikan ke dokter untuk pengobatan antivirus dan penghilang rasa sakit.";
      break;

    default:
      explanation = "Hasil tidak dapat diidentifikasi.";
      suggestion = "Cobalah mengunggah gambar lain atau konsultasikan dengan ahli medis.";
  }

  return { confidenceScore, label, explanation, suggestion };
}

module.exports = predictClassification;