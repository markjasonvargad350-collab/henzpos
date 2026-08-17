import { PresetKit } from '../types';

export const PRESET_KITS: PresetKit[] = [
  {
    id: 'kit-henz-phlebotomy',
    name: 'Complete Phlebotomy Kit for Medical Laboratory Science (MLS / BSMT)',
    targetAudience: 'Medical Technology / Medical Laboratory Science Students & Phlebotomists',
    category: 'Student Clinical Kits',
    description: 'Featured on HENZ Facebook: Complete blood extraction bundle with EDTA, Clot & Citrate vacuum tubes, butterfly needles, multi-sample holder, tourniquet, lancets, alcohol swabs, micropore, and biohazard sharps box.',
    discountPercentage: 12,
    items: [
      { productId: 'prod-068', quantity: 1 }, // Vacutainer EDTA Lavender Box 100s
      { productId: 'prod-069', quantity: 1 }, // Vacutainer Clot Activator Red Box 100s
      { productId: 'prod-070', quantity: 1 }, // Vacutainer Sodium Citrate Blue Box 100s
      { productId: 'prod-072', quantity: 1 }, // Butterfly Needle Set Box 50s
      { productId: 'prod-073', quantity: 1 }, // Multi-Sample Needles Box 100s
      { productId: 'prod-074', quantity: 2 }, // Needle Holder Barrel
      { productId: 'prod-051', quantity: 2 }, // Quick-Release Tourniquet
      { productId: 'prod-075', quantity: 1 }, // Twist Lancets Box 100s
      { productId: 'prod-044', quantity: 2 }, // Alcohol Swab Pads Box 100s
      { productId: 'prod-022', quantity: 2 }, // Micropore Tape 1"
      { productId: 'prod-002', quantity: 1 }, // Nitrile Exam Gloves Box 100s
      { productId: 'prod-057', quantity: 1 }, // Sharps Container 5L
    ],
  },
  {
    id: 'kit-henz-lab-glassware',
    name: 'Medical Laboratory Glassware & Reagent Starter Bundle',
    targetAudience: 'MLS, Pharmacy, Biology & Clinical Chemistry Students',
    category: 'Student Clinical Kits',
    description: 'Complete glassware and diagnostic staining essentials: Borosilicate beakers, graduated cylinder, Erlenmeyer flask, test tube rack, inoculating loops, and Gram stain 4-bottle reagent set.',
    discountPercentage: 10,
    items: [
      { productId: 'prod-080', quantity: 1 }, // Borosilicate Beaker Set (4s)
      { productId: 'prod-081', quantity: 1 }, // Graduated Cylinder 100ml
      { productId: 'prod-082', quantity: 1 }, // Erlenmeyer Flask 250ml
      { productId: 'prod-084', quantity: 1 }, // Test Tube Rack 60-Hole
      { productId: 'prod-085', quantity: 1 }, // Inoculating Loop & Needle
      { productId: 'prod-061', quantity: 1 }, // Gram Stain 4-Bottle Kit
      { productId: 'prod-063', quantity: 1 }, // Lugol's Iodine 500ml
      { productId: 'prod-067', quantity: 1 }, // Distilled Water 1000ml
    ],
  },
  {
    id: 'kit-henz-footwear-protection',
    name: 'Medical Footwear & Protective Duty Bundle',
    targetAudience: 'Hospital Rotations, Operating Room, & Clinical Duty Interns',
    category: 'Student Clinical Kits',
    description: 'Facebook featured anti-slip autoclavable medical duty slip-on clogs, non-skid shoe covers, bouffant scrub caps, N95 respirator, and diagnostic penlight.',
    discountPercentage: 10,
    items: [
      { productId: 'prod-086', quantity: 1 }, // Medical Anti-Slip Duty Shoes White
      { productId: 'prod-006', quantity: 1 }, // Shoe Covers Pack 100s
      { productId: 'prod-005', quantity: 1 }, // Bouffant Scrub Caps Pack 100s
      { productId: 'prod-004', quantity: 1 }, // N95 Particulate Respirator Box 20s
      { productId: 'prod-002', quantity: 1 }, // Nitrile Exam Gloves Box 100s
      { productId: 'prod-011', quantity: 1 }, // Diagnostic Penlight
    ],
  },
  {
    id: 'kit-usa-bsn',
    name: 'University of San Agustin (USA) - BSN Clinical Duty Bundle',
    targetAudience: 'University of San Agustin (USA) - College of Nursing & Health Sciences',
    category: 'Student Clinical Kits',
    description: 'Official Augustinian nursing uniform duty requirements: BP apparatus, stethoscope, penlight, surgical instruments, and duty accessories.',
    discountPercentage: 10,
    items: [
      { productId: 'prod-007', quantity: 1 }, // Aneroid Sphygmomanometer
      { productId: 'prod-008', quantity: 1 }, // Dual Head Stethoscope
      { productId: 'prod-009', quantity: 1 }, // Fingertip Pulse Oximeter
      { productId: 'prod-010', quantity: 1 }, // Digital Clinical Thermometer
      { productId: 'prod-011', quantity: 1 }, // Medical Diagnostic Penlight
      { productId: 'prod-028', quantity: 1 }, // Mosquito Forceps Straight
      { productId: 'prod-029', quantity: 1 }, // Mosquito Forceps Curved
      { productId: 'prod-031', quantity: 1 }, // Lister Bandage Scissors
      { productId: 'prod-032', quantity: 1 }, // Suture Scissors
      { productId: 'prod-033', quantity: 1 }, // Thumb Tissue Forceps
      { productId: 'prod-034', quantity: 1 }, // Needle Holder
      { productId: 'prod-035', quantity: 1 }, // Scalpel Handle #3
      { productId: 'prod-052', quantity: 1 }, // Stainless Kidney Basin
      { productId: 'prod-053', quantity: 2 }, // SS Medicine Cup
      { productId: 'prod-051', quantity: 1 }, // Tourniquet Quick-Release
      { productId: 'prod-001', quantity: 1 }, // Latex Gloves Box (100s)
      { productId: 'prod-003', quantity: 1 }, // 3-Ply Face Masks Box
      { productId: 'prod-022', quantity: 2 }, // Micropore Tape 1"
      { productId: 'prod-019', quantity: 1 }, // Sterile Gauze 4x4
      { productId: 'prod-041', quantity: 1 }, // 70% Isopropyl Alcohol 500ml
      { productId: 'prod-044', quantity: 1 }, // Alcohol Prep Pads
      { productId: 'prod-060', quantity: 1 }, // Retractable Measuring Tape
    ],
  },
  {
    id: 'kit-wvsu-duty',
    name: 'West Visayas State University (WVSU) - BSN/Medicine Clinical Kit',
    targetAudience: 'West Visayas State University (WVSU) - College of Nursing / COM',
    category: 'Student Clinical Kits',
    description: 'High-spec diagnostic and minor surgical skill set tailored for WVSU medical and nursing rotation standards.',
    discountPercentage: 8,
    items: [
      { productId: 'prod-007', quantity: 1 }, // Aneroid BP Set
      { productId: 'prod-008', quantity: 1 }, // Stethoscope
      { productId: 'prod-009', quantity: 1 }, // Pulse Oximeter
      { productId: 'prod-011', quantity: 1 }, // Diagnostic Penlight
      { productId: 'prod-028', quantity: 1 }, // Mosquito Straight
      { productId: 'prod-031', quantity: 1 }, // Bandage Scissors
      { productId: 'prod-034', quantity: 1 }, // Needle Holder
      { productId: 'prod-038', quantity: 2 }, // Silk Suture 3-0
      { productId: 'prod-036', quantity: 1 }, // Scalpel Blades #10
      { productId: 'prod-002', quantity: 1 }, // Nitrile Exam Gloves Box
      { productId: 'prod-040', quantity: 1 }, // Povidone Iodine Betadine 120ml
      { productId: 'prod-019', quantity: 2 }, // Gauze 4x4
      { productId: 'prod-022', quantity: 2 }, // Micropore 1"
    ],
  },
  {
    id: 'kit-idc-care',
    name: 'Iloilo Doctors College (IDC) - Nursing & Allied Medical Starter',
    targetAudience: 'Iloilo Doctors College (IDC) - Nursing & Allied Medical Sciences',
    category: 'Student Clinical Kits',
    description: 'IDC core clinical bag requirements with vital signs monitoring set, sterile dressings, and antiseptic care kit.',
    discountPercentage: 8,
    items: [
      { productId: 'prod-007', quantity: 1 }, // Aneroid BP Set
      { productId: 'prod-008', quantity: 1 }, // Stethoscope
      { productId: 'prod-010', quantity: 1 }, // Clinical Thermometer
      { productId: 'prod-011', quantity: 1 }, // Diagnostic Penlight
      { productId: 'prod-028', quantity: 1 }, // Mosquito Forceps Straight
      { productId: 'prod-031', quantity: 1 }, // Bandage Scissors
      { productId: 'prod-051', quantity: 1 }, // Tourniquet
      { productId: 'prod-001', quantity: 1 }, // Latex Gloves Box
      { productId: 'prod-003', quantity: 1 }, // 3-Ply Face Mask Box
      { productId: 'prod-022', quantity: 2 }, // Micropore 1"
      { productId: 'prod-025', quantity: 2 }, // Triangular Bandages
      { productId: 'prod-041', quantity: 1 }, // Alcohol 500ml
      { productId: 'prod-052', quantity: 1 }, // Kidney Basin
    ],
  },
  {
    id: 'kit-cpu-medtech',
    name: 'Central Philippine University (CPU) - BSN & MedTech Phlebotomy Pack',
    targetAudience: 'Central Philippine University (CPU) - College of Nursing & MedLab Science',
    category: 'Student Clinical Kits',
    description: 'Comprehensive blood extraction, IV cannulation, and patient assessment kit for Centralian health sciences.',
    discountPercentage: 7,
    items: [
      { productId: 'prod-045', quantity: 2 }, // IV Cannula 20G
      { productId: 'prod-046', quantity: 2 }, // IV Cannula 22G
      { productId: 'prod-047', quantity: 2 }, // IV Macro Drip Set
      { productId: 'prod-049', quantity: 2 }, // 0.9% NSS 1 Liter
      { productId: 'prod-051', quantity: 2 }, // Tourniquet
      { productId: 'prod-044', quantity: 2 }, // Alcohol Swab box
      { productId: 'prod-013', quantity: 1 }, // 1cc Syringe box
      { productId: 'prod-014', quantity: 1 }, // 3cc Syringe box
      { productId: 'prod-015', quantity: 1 }, // 5cc Syringe box
      { productId: 'prod-002', quantity: 1 }, // Nitrile Gloves box
      { productId: 'prod-022', quantity: 2 }, // Micropore 1"
      { productId: 'prod-057', quantity: 1 }, // Sharps Container
    ],
  },
  {
    id: 'kit-ui-phinma',
    name: 'PHINMA University of Iloilo (UI) - Clinical & EMT First Responder Kit',
    targetAudience: 'PHINMA University of Iloilo (UI) - College of Allied Health / Criminology',
    category: 'Student Clinical Kits',
    description: 'Emergency response, immobilization, vital signs, and wound triage kit tailored for UI students.',
    discountPercentage: 9,
    items: [
      { productId: 'prod-007', quantity: 1 }, // Aneroid BP
      { productId: 'prod-008', quantity: 1 }, // Stethoscope
      { productId: 'prod-009', quantity: 1 }, // Pulse Oximeter
      { productId: 'prod-011', quantity: 1 }, // Penlight
      { productId: 'prod-024', quantity: 3 }, // Elastic Bandages 4"
      { productId: 'prod-025', quantity: 4 }, // Triangular Bandages
      { productId: 'prod-019', quantity: 2 }, // Gauze 4x4
      { productId: 'prod-021', quantity: 2 }, // Gauze Roll 4"
      { productId: 'prod-031', quantity: 1 }, // Bandage Scissors
      { productId: 'prod-041', quantity: 2 }, // Alcohol 500ml
      { productId: 'prod-040', quantity: 1 }, // Betadine 120ml
      { productId: 'prod-001', quantity: 1 }, // Latex Gloves Box
    ],
  },
  {
    id: 'kit-spui-nursing',
    name: 'St. Paul University Iloilo (SPUI) - Paulinian Holistic Nursing Bundle',
    targetAudience: 'St. Paul University Iloilo (SPUI) - College of Nursing',
    category: 'Student Clinical Kits',
    description: 'Complete bedside patient care, clinical assessment, and infection control supply package for SPUI nursing duties.',
    discountPercentage: 10,
    items: [
      { productId: 'prod-007', quantity: 1 }, // Aneroid BP
      { productId: 'prod-008', quantity: 1 }, // Stethoscope
      { productId: 'prod-010', quantity: 1 }, // Thermometer
      { productId: 'prod-011', quantity: 1 }, // Diagnostic Penlight
      { productId: 'prod-028', quantity: 1 }, // Mosquito Forceps
      { productId: 'prod-031', quantity: 1 }, // Bandage Scissors
      { productId: 'prod-052', quantity: 1 }, // Stainless Kidney Basin
      { productId: 'prod-053', quantity: 2 }, // Medicine Cups
      { productId: 'prod-051', quantity: 1 }, // Tourniquet
      { productId: 'prod-001', quantity: 1 }, // Latex Gloves Box
      { productId: 'prod-003', quantity: 1 }, // Face Mask Box
      { productId: 'prod-022', quantity: 2 }, // Micropore 1"
      { productId: 'prod-041', quantity: 1 }, // 70% Alcohol 500ml
    ],
  },
  {
    id: 'kit-wound-suture',
    name: 'Minor Surgical & Suture Practice Bundle',
    targetAudience: 'Medical, Nursing & EMT Skills Training',
    category: 'Student Clinical Kits',
    description: 'Essential instruments and sterile supplies for minor surgical debridement and suturing.',
    discountPercentage: 10,
    items: [
      { productId: 'prod-034', quantity: 1 }, // Needle Holder
      { productId: 'prod-032', quantity: 1 }, // Iris Suture Scissors
      { productId: 'prod-033', quantity: 1 }, // Thumb Tissue Forceps
      { productId: 'prod-035', quantity: 1 }, // Scalpel Handle #3
      { productId: 'prod-036', quantity: 1 }, // Scalpel Blades #10 box
      { productId: 'prod-037', quantity: 1 }, // Scalpel Blades #11 box
      { productId: 'prod-038', quantity: 2 }, // Silk Suture 3-0 box
      { productId: 'prod-039', quantity: 1 }, // Betadine 500ml
      { productId: 'prod-019', quantity: 2 }, // Gauze 4x4 box
      { productId: 'prod-021', quantity: 1 }, // Gauze Roll 4" pack
      { productId: 'prod-002', quantity: 1 }, // Nitrile Gloves box
      { productId: 'prod-052', quantity: 1 }, // Kidney Basin
    ],
  },
  {
    id: 'kit-clinic-essential',
    name: 'School / Barangay Health Station Clinic Restock',
    targetAudience: 'School Clinics, RHU, Barangay Health Workers',
    category: 'Hospital & Clinic Supplies',
    description: 'High-turnover diagnostic, first aid, disinfection, and triage supplies.',
    discountPercentage: 7,
    items: [
      { productId: 'prod-007', quantity: 1 }, // Aneroid BP Set
      { productId: 'prod-008', quantity: 1 }, // Stethoscope
      { productId: 'prod-009', quantity: 1 }, // Oximeter
      { productId: 'prod-010', quantity: 2 }, // Digital Thermometers
      { productId: 'prod-001', quantity: 3 }, // Latex Gloves Box
      { productId: 'prod-003', quantity: 4 }, // 3-Ply Face Masks
      { productId: 'prod-041', quantity: 3 }, // 70% Alcohol 500ml
      { productId: 'prod-039', quantity: 2 }, // Betadine 500ml
      { productId: 'prod-044', quantity: 3 }, // Alcohol Swabs
      { productId: 'prod-019', quantity: 2 }, // Gauze 4x4
      { productId: 'prod-020', quantity: 2 }, // Gauze 2x2
      { productId: 'prod-022', quantity: 3 }, // Micropore 1"
      { productId: 'prod-024', quantity: 2 }, // Elastic Bandages
      { productId: 'prod-025', quantity: 4 }, // Triangular Bandages
      { productId: 'prod-054', quantity: 2 }, // Tongue Depressors
      { productId: 'prod-057', quantity: 1 }, // Sharps Container 5L
    ],
  },
];
