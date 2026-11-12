import os
import sys
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import (
    roc_curve, auc, precision_recall_curve,
    average_precision_score, confusion_matrix
)

# Ensure UTF-8 stdout on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Set non-interactive backend for server generation
plt.switch_backend('Agg')

# Style configuration for clean, publication-quality plots
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['figure.dpi'] = 300

def generate_charts():
    print("=" * 60)
    print("[INFO] Generating Random Forest Evaluation Proof Charts...")
    print("=" * 60)
    
    os.makedirs("ai/reports", exist_ok=True)
    
    model_path = "ai/models/fraud_detection_model.joblib"
    if not os.path.exists(model_path):
        print(f"[ERROR] Model not found at {model_path}")
        return
        
    model_data = joblib.load(model_path)
    pipeline = model_data['pipeline']
    threshold = model_data.get('threshold', 0.40)
    
    # Load evaluation test sample from PaySim
    csv_path = "ai/data/paysim.csv"
    if os.path.exists(csv_path):
        print("[INFO] Loading test dataset partition (step > 600)...")
        df = pd.read_csv(csv_path, usecols=['step', 'type', 'amount', 'isFraud'])
        test_df = df[df['step'] > 600].copy()
        
        # Take a balanced representative evaluation subset (all fraud + 50k normal)
        fraud_subset = test_df[test_df['isFraud'] == 1]
        normal_subset = test_df[test_df['isFraud'] == 0].sample(n=min(50000, len(test_df[test_df['isFraud'] == 0])), random_state=42)
        eval_sample = pd.concat([fraud_subset, normal_subset]).sample(frac=1.0, random_state=42)
        
        X_test = eval_sample[['step', 'type', 'amount']]
        y_test = eval_sample['isFraud'].values
        
        print("[INFO] Computing probabilities on holdout test set...")
        y_probs = pipeline.predict_proba(X_test)[:, 1]
        y_preds = (y_probs >= threshold).astype(int)
    else:
        print("[WARNING] paysim.csv not found, using precomputed metrics.")
        return

    # -------------------------------------------------------------
    # 1. PLOT MASTER 4-PANEL EVALUATION DASHBOARD
    # -------------------------------------------------------------
    fig, axes = plt.subplots(2, 2, figsize=(14, 11))
    fig.suptitle("VeriFund Random Forest Fraud Classifier - Empirical Verification Dashboard", fontsize=16, fontweight='bold', y=0.98, color='#0f172a')
    
    # --- PANEL 1: ROC CURVE ---
    fpr, tpr, _ = roc_curve(y_test, y_probs)
    roc_auc = auc(fpr, tpr)
    
    ax1 = axes[0, 0]
    ax1.plot(fpr, tpr, color='#2563eb', lw=2.5, label=f'Random Forest (ROC-AUC = {roc_auc:.4f})')
    ax1.plot([0, 1], [0, 1], color='#94a3b8', lw=1.5, linestyle='--', label='Random Baseline (AUC = 0.50)')
    ax1.set_xlim([-0.02, 1.0])
    ax1.set_ylim([0.0, 1.05])
    ax1.set_xlabel('False Positive Rate (1 - Specificity)', fontweight='bold', fontsize=10)
    ax1.set_ylabel('True Positive Rate (Sensitivity / Recall)', fontweight='bold', fontsize=10)
    ax1.set_title('A. Receiver Operating Characteristic (ROC) Curve', fontweight='bold', fontsize=12, pad=10, color='#1e293b')
    ax1.legend(loc='lower right', frameon=True, framealpha=0.9)
    ax1.grid(True, linestyle=':', alpha=0.6)
    
    # --- PANEL 2: PRECISION-RECALL CURVE ---
    prec, rec, _ = precision_recall_curve(y_test, y_probs)
    pr_auc = average_precision_score(y_test, y_probs)
    
    ax2 = axes[0, 1]
    ax2.plot(rec, prec, color='#059669', lw=2.5, label=f'Precision-Recall (PR-AUC = {pr_auc:.4f})')
    ax2.axhline(y=len(fraud_subset)/len(eval_sample), color='#94a3b8', linestyle='--', label='No-Skill Baseline')
    ax2.set_xlim([0.0, 1.02])
    ax2.set_ylim([0.0, 1.05])
    ax2.set_xlabel('Recall (Fraud Detection Rate)', fontweight='bold', fontsize=10)
    ax2.set_ylabel('Precision (Positive Predictive Value)', fontweight='bold', fontsize=10)
    ax2.set_title('B. Precision-Recall Curve (Imbalanced Benchmark)', fontweight='bold', fontsize=12, pad=10, color='#1e293b')
    ax2.legend(loc='lower left', frameon=True, framealpha=0.9)
    ax2.grid(True, linestyle=':', alpha=0.6)
    
    # --- PANEL 3: CONFUSION MATRIX HEATMAP ---
    cm = confusion_matrix(y_test, y_preds)
    tn, fp, fn, tp = cm.ravel()
    
    ax3 = axes[1, 0]
    cm_matrix = np.array([[tn, fp], [fn, tp]])
    im = ax3.imshow(cm_matrix, interpolation='nearest', cmap=plt.cm.Blues)
    ax3.set_title(f'C. Confusion Matrix on Holdout Set (θ = {threshold:.2f})', fontweight='bold', fontsize=12, pad=10, color='#1e293b')
    
    tick_marks = np.arange(2)
    ax3.set_xticks(tick_marks)
    ax3.set_yticks(tick_marks)
    ax3.set_xticklabels(['Pred Legitimate (0)', 'Pred Fraud (1)'], fontweight='bold')
    ax3.set_yticklabels(['Actual Legitimate (0)', 'Actual Fraud (1)'], fontweight='bold')
    
    # Print numbers and labels inside confusion matrix cells
    thresh_val = cm_matrix.max() / 2.
    labels_cm = [
        [f"True Neg (TN)\n{tn:,}\n({tn/len(y_test)*100:.1f}%)", f"False Pos (FP)\n{fp:,}\n({fp/len(y_test)*100:.2f}%)"],
        [f"False Neg (FN)\n{fn:,}\n({fn/len(y_test)*100:.2f}%)", f"True Pos (TP)\n{tp:,}\n({tp/len(y_test)*100:.1f}%)"]
    ]
    for i in range(2):
        for j in range(2):
            ax3.text(j, i, labels_cm[i][j], ha="center", va="center",
                     color="white" if cm_matrix[i, j] > thresh_val else "#0f172a",
                     fontweight='bold', fontsize=10)
    ax3.grid(False)
    
    # --- PANEL 4: FEATURE IMPORTANCE BAR CHART ---
    ax4 = axes[1, 1]
    rf_clf = pipeline.named_steps['classifier']
    preprocessor = pipeline.named_steps['preprocessor']
    
    cat_features = list(preprocessor.named_transformers_['cat'].get_feature_names_out(['type']))
    num_features = ['amount', 'step']
    all_feature_names = cat_features + num_features
    importances = rf_clf.feature_importances_
    
    # Sort features by importance
    sorted_idx = np.argsort(importances)
    y_pos = np.arange(len(sorted_idx))
    
    ax4.barh(y_pos, importances[sorted_idx], color='#6366f1', edgecolor='#4338ca', height=0.6)
    ax4.set_yticks(y_pos)
    ax4.set_yticklabels([all_feature_names[i] for i in sorted_idx], fontweight='bold', fontsize=9)
    ax4.set_xlabel('Gini Feature Importance Weight', fontweight='bold', fontsize=10)
    ax4.set_title('D. Random Forest Feature Importance', fontweight='bold', fontsize=12, pad=10, color='#1e293b')
    ax4.grid(True, linestyle=':', alpha=0.6)
    
    for i, v in enumerate(importances[sorted_idx]):
        ax4.text(v + 0.01, i, f"{v*100:.1f}%", va='center', fontweight='bold', fontsize=8, color='#334155')

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    
    dashboard_path = "ai/reports/random_forest_evaluation_dashboard.png"
    plt.savefig(dashboard_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"[SUCCESS] Generated Master Evaluation Dashboard: {dashboard_path}")
    print("=" * 60)
    print("[DONE] All Random Forest Proof Graphs Generated Successfully!")
    print("=" * 60)

if __name__ == "__main__":
    generate_charts()
