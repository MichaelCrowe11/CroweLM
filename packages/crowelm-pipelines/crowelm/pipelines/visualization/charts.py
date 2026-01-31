"""
Property Charts Module

Provides scientific data visualization using Matplotlib:
- QED score distributions
- Lipinski/Veber property radar plots
- Molecule property scatter plots
- Pipeline progress and summary charts

Requires: matplotlib>=3.7.0, Pillow>=10.0.0
"""

import io
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from matplotlib.figure import Figure


class ChartGenerator:
    """
    Generate scientific charts and visualizations using Matplotlib.

    Creates publication-quality figures for drug discovery data.
    """

    # Style configuration
    STYLE_CONFIG = {
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "axes.edgecolor": "#333333",
        "axes.labelcolor": "#333333",
        "text.color": "#333333",
        "xtick.color": "#333333",
        "ytick.color": "#333333",
        "grid.color": "#e0e0e0",
        "font.family": "sans-serif",
    }

    # Color palette for charts
    COLORS = {
        "primary": "#2196F3",
        "secondary": "#4CAF50",
        "accent": "#FF9800",
        "warning": "#F44336",
        "success": "#4CAF50",
        "neutral": "#9E9E9E",
        "gradient": ["#1976D2", "#2196F3", "#64B5F6", "#90CAF9"],
    }

    def __init__(
        self,
        figsize: Tuple[float, float] = (10, 6),
        dpi: int = 150,
        style: str = "seaborn-v0_8-whitegrid",
    ):
        """
        Initialize the chart generator.

        Args:
            figsize: Default figure size (width, height) in inches.
            dpi: Resolution for saved images.
            style: Matplotlib style to use.
        """
        self.figsize = figsize
        self.dpi = dpi
        self.style = style

    def _apply_style(self):
        """Apply consistent styling to charts."""
        try:
            plt.style.use(self.style)
        except OSError:
            plt.style.use("seaborn-v0_8-whitegrid")
        plt.rcParams.update(self.STYLE_CONFIG)

    def _fig_to_bytes(self, fig: Figure, format: str = "png") -> bytes:
        """
        Convert matplotlib figure to bytes.

        Args:
            fig: Matplotlib figure.
            format: Output format (png, svg, pdf).

        Returns:
            Image bytes.
        """
        buf = io.BytesIO()
        fig.savefig(buf, format=format, dpi=self.dpi, bbox_inches="tight")
        buf.seek(0)
        plt.close(fig)
        return buf.getvalue()

    def qed_distribution(
        self,
        molecules: List[Dict],
        score_key: str = "score",
        title: str = "QED Score Distribution",
        bins: int = 20,
    ) -> bytes:
        """
        Create histogram of QED score distribution.

        Args:
            molecules: List of molecule dicts with scores.
            score_key: Key for QED score in dict.
            title: Chart title.
            bins: Number of histogram bins.

        Returns:
            PNG image bytes.
        """
        self._apply_style()

        scores = [mol.get(score_key, 0) for mol in molecules if mol.get(score_key) is not None]

        if not scores:
            raise ValueError("No valid QED scores found in molecules")

        fig, ax = plt.subplots(figsize=self.figsize)

        # Create histogram
        n, bins_edges, patches = ax.hist(
            scores,
            bins=bins,
            color=self.COLORS["primary"],
            edgecolor="white",
            alpha=0.8,
        )

        # Add statistics
        mean_score = np.mean(scores)
        median_score = np.median(scores)

        ax.axvline(
            mean_score,
            color=self.COLORS["accent"],
            linestyle="--",
            linewidth=2,
            label=f"Mean: {mean_score:.3f}",
        )
        ax.axvline(
            median_score,
            color=self.COLORS["secondary"],
            linestyle="-.",
            linewidth=2,
            label=f"Median: {median_score:.3f}",
        )

        # Drug-likeness threshold
        ax.axvline(
            0.5,
            color=self.COLORS["warning"],
            linestyle=":",
            linewidth=2,
            label="Drug-likeness threshold (0.5)",
        )

        ax.set_xlabel("QED Score", fontsize=12)
        ax.set_ylabel("Frequency", fontsize=12)
        ax.set_title(title, fontsize=14, fontweight="bold")
        ax.legend(loc="upper left")
        ax.set_xlim(0, 1)

        # Add statistics text box
        stats_text = f"N = {len(scores)}\nMax: {max(scores):.3f}\nMin: {min(scores):.3f}"
        ax.text(
            0.95,
            0.95,
            stats_text,
            transform=ax.transAxes,
            fontsize=10,
            verticalalignment="top",
            horizontalalignment="right",
            bbox=dict(boxstyle="round", facecolor="white", alpha=0.8),
        )

        return self._fig_to_bytes(fig)

    def property_radar(
        self,
        molecule: Dict,
        title: Optional[str] = None,
        properties: Optional[List[str]] = None,
    ) -> bytes:
        """
        Create radar plot of molecular properties (Lipinski/Veber).

        Args:
            molecule: Dict with molecular properties.
            title: Chart title.
            properties: List of property names to include.

        Returns:
            PNG image bytes.
        """
        self._apply_style()

        # Default properties with ideal ranges (normalized to 0-1)
        default_properties = {
            "MW": {"value": molecule.get("molecular_weight", 0), "max": 500, "ideal": 350},
            "LogP": {"value": molecule.get("logp", 0) + 3, "max": 8, "ideal": 4},  # Shifted for positive
            "HBD": {"value": molecule.get("hbd", 0), "max": 5, "ideal": 2},
            "HBA": {"value": molecule.get("hba", 0), "max": 10, "ideal": 5},
            "TPSA": {"value": molecule.get("tpsa", 0), "max": 140, "ideal": 80},
            "RotBonds": {"value": molecule.get("rotatable_bonds", 0), "max": 10, "ideal": 5},
        }

        if properties:
            default_properties = {k: v for k, v in default_properties.items() if k in properties}

        labels = list(default_properties.keys())
        num_vars = len(labels)

        # Normalize values
        values = []
        ideal_values = []
        for prop in default_properties.values():
            normalized = min(prop["value"] / prop["max"], 1.0) if prop["max"] > 0 else 0
            ideal_normalized = prop["ideal"] / prop["max"] if prop["max"] > 0 else 0
            values.append(normalized)
            ideal_values.append(ideal_normalized)

        # Close the radar chart
        values += values[:1]
        ideal_values += ideal_values[:1]

        # Calculate angles
        angles = [n / float(num_vars) * 2 * np.pi for n in range(num_vars)]
        angles += angles[:1]

        fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))

        # Plot ideal range
        ax.fill(angles, ideal_values, color=self.COLORS["secondary"], alpha=0.2, label="Ideal Range")
        ax.plot(angles, ideal_values, color=self.COLORS["secondary"], linewidth=2, linestyle="--")

        # Plot molecule values
        ax.fill(angles, values, color=self.COLORS["primary"], alpha=0.4, label="Molecule")
        ax.plot(angles, values, color=self.COLORS["primary"], linewidth=2)
        ax.scatter(angles[:-1], values[:-1], color=self.COLORS["primary"], s=100, zorder=5)

        # Set labels
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(labels, fontsize=11)
        ax.set_ylim(0, 1)

        title = title or f"Property Profile: {molecule.get('smiles', 'Unknown')[:30]}"
        ax.set_title(title, fontsize=14, fontweight="bold", pad=20)
        ax.legend(loc="upper right", bbox_to_anchor=(1.2, 1.0))

        return self._fig_to_bytes(fig)

    def scatter_plot(
        self,
        molecules: List[Dict],
        x_prop: str,
        y_prop: str,
        color_prop: Optional[str] = None,
        size_prop: Optional[str] = None,
        title: Optional[str] = None,
        x_label: Optional[str] = None,
        y_label: Optional[str] = None,
    ) -> bytes:
        """
        Create scatter plot of two molecular properties.

        Args:
            molecules: List of molecule dicts.
            x_prop: Property for X-axis.
            y_prop: Property for Y-axis.
            color_prop: Property for color coding.
            size_prop: Property for point size.
            title: Chart title.
            x_label: X-axis label.
            y_label: Y-axis label.

        Returns:
            PNG image bytes.
        """
        self._apply_style()

        x_values = [mol.get(x_prop, 0) for mol in molecules]
        y_values = [mol.get(y_prop, 0) for mol in molecules]

        fig, ax = plt.subplots(figsize=self.figsize)

        # Color mapping
        if color_prop:
            c_values = [mol.get(color_prop, 0) for mol in molecules]
            scatter = ax.scatter(
                x_values,
                y_values,
                c=c_values,
                cmap="viridis",
                alpha=0.7,
                s=100 if not size_prop else None,
            )
            plt.colorbar(scatter, label=color_prop)
        else:
            ax.scatter(
                x_values,
                y_values,
                c=self.COLORS["primary"],
                alpha=0.7,
                s=100,
            )

        ax.set_xlabel(x_label or x_prop, fontsize=12)
        ax.set_ylabel(y_label or y_prop, fontsize=12)
        ax.set_title(title or f"{y_prop} vs {x_prop}", fontsize=14, fontweight="bold")
        ax.grid(True, alpha=0.3)

        return self._fig_to_bytes(fig)

    def pipeline_summary(
        self,
        results: Dict,
        title: str = "Pipeline Results Summary",
    ) -> bytes:
        """
        Create summary visualization of pipeline results.

        Args:
            results: Pipeline results dictionary.
            title: Chart title.

        Returns:
            PNG image bytes.
        """
        self._apply_style()

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        # 1. Stage completion status (top-left)
        ax1 = axes[0, 0]
        stages = results.get("stages", {})
        stage_names = list(stages.keys())
        stage_status = []
        colors = []

        for stage in stage_names:
            stage_data = stages[stage]
            if isinstance(stage_data, dict):
                if stage_data.get("skipped"):
                    stage_status.append("Skipped")
                    colors.append(self.COLORS["neutral"])
                elif stage_data.get("error"):
                    stage_status.append("Failed")
                    colors.append(self.COLORS["warning"])
                else:
                    stage_status.append("Complete")
                    colors.append(self.COLORS["success"])
            else:
                stage_status.append("Complete")
                colors.append(self.COLORS["success"])

        y_pos = np.arange(len(stage_names))
        ax1.barh(y_pos, [1] * len(stage_names), color=colors, alpha=0.8)
        ax1.set_yticks(y_pos)
        ax1.set_yticklabels([s.replace("_", " ").title() for s in stage_names])
        ax1.set_xlim(0, 1.2)
        ax1.set_title("Pipeline Stages", fontsize=12, fontweight="bold")

        # Add status labels
        for i, status in enumerate(stage_status):
            ax1.text(1.05, i, status, va="center", fontsize=10)

        # 2. QED distribution of generated ligands (top-right)
        ax2 = axes[0, 1]
        ligands = stages.get("ligand_generation", {}).get("molecules", [])
        if ligands:
            scores = [mol.get("score", 0) for mol in ligands]
            ax2.hist(scores, bins=10, color=self.COLORS["primary"], edgecolor="white", alpha=0.8)
            ax2.axvline(np.mean(scores), color=self.COLORS["accent"], linestyle="--", label=f"Mean: {np.mean(scores):.3f}")
            ax2.set_xlabel("QED Score")
            ax2.set_ylabel("Count")
            ax2.set_title("Generated Ligands QED Distribution", fontsize=12, fontweight="bold")
            ax2.legend()
        else:
            ax2.text(0.5, 0.5, "No ligands generated", ha="center", va="center", fontsize=12)
            ax2.set_title("Generated Ligands", fontsize=12, fontweight="bold")

        # 3. Target information (bottom-left)
        ax3 = axes[1, 0]
        ax3.axis("off")
        target_analysis = stages.get("target_analysis", {})
        uniprot = target_analysis.get("uniprot", {})

        info_text = f"""
Target ID: {results.get('target_id', 'N/A')}
Gene: {uniprot.get('gene', 'N/A')}
Protein: {uniprot.get('protein_name', 'N/A')[:50]}
Organism: {uniprot.get('organism', 'N/A')}
Sequence Length: {uniprot.get('sequence_length', 'N/A')} residues

Structure: {'✓ Predicted' if stages.get('structure_prediction', {}).get('pdb_generated') else '✗ Not available'}
Ligands: {len(ligands)} generated
        """
        ax3.text(0.1, 0.9, info_text, fontsize=11, va="top", family="monospace",
                 bbox=dict(boxstyle="round", facecolor="white", edgecolor="gray"))
        ax3.set_title("Target Summary", fontsize=12, fontweight="bold")

        # 4. Top molecules table (bottom-right)
        ax4 = axes[1, 1]
        ax4.axis("off")

        if ligands:
            sorted_ligands = sorted(ligands, key=lambda x: x.get("score", 0), reverse=True)[:5]
            table_data = []
            for i, mol in enumerate(sorted_ligands, 1):
                smiles = mol.get("sample", "N/A")[:30]
                score = mol.get("score", 0)
                table_data.append([i, smiles + "...", f"{score:.3f}"])

            table = ax4.table(
                cellText=table_data,
                colLabels=["Rank", "SMILES", "QED"],
                loc="center",
                cellLoc="left",
                colColours=[self.COLORS["primary"]] * 3,
            )
            table.auto_set_font_size(False)
            table.set_fontsize(10)
            table.scale(1.2, 1.5)

            # Style header
            for (row, col), cell in table.get_celld().items():
                if row == 0:
                    cell.set_text_props(color="white", fontweight="bold")

        ax4.set_title("Top 5 Candidates", fontsize=12, fontweight="bold")

        fig.suptitle(title, fontsize=16, fontweight="bold", y=1.02)
        plt.tight_layout()

        return self._fig_to_bytes(fig)

    def lipinski_compliance(
        self,
        molecules: List[Dict],
        title: str = "Lipinski Rule of Five Compliance",
    ) -> bytes:
        """
        Create chart showing Lipinski rule compliance.

        Args:
            molecules: List of molecule dicts with properties.
            title: Chart title.

        Returns:
            PNG image bytes.
        """
        self._apply_style()

        # Lipinski thresholds
        thresholds = {
            "MW ≤ 500": ("molecular_weight", 500, "le"),
            "LogP ≤ 5": ("logp", 5, "le"),
            "HBD ≤ 5": ("hbd", 5, "le"),
            "HBA ≤ 10": ("hba", 10, "le"),
        }

        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        axes = axes.flatten()

        for idx, (rule_name, (prop, threshold, op)) in enumerate(thresholds.items()):
            ax = axes[idx]
            values = [mol.get(prop, 0) for mol in molecules if mol.get(prop) is not None]

            if not values:
                ax.text(0.5, 0.5, "No data", ha="center", va="center")
                ax.set_title(rule_name)
                continue

            # Calculate pass/fail
            if op == "le":
                passed = sum(1 for v in values if v <= threshold)
            else:
                passed = sum(1 for v in values if v >= threshold)

            failed = len(values) - passed

            # Create histogram
            colors_list = [self.COLORS["success"] if (v <= threshold if op == "le" else v >= threshold) else self.COLORS["warning"] for v in values]

            ax.hist(values, bins=15, color=self.COLORS["primary"], edgecolor="white", alpha=0.7)
            ax.axvline(threshold, color=self.COLORS["warning"], linestyle="--", linewidth=2, label=f"Threshold: {threshold}")

            ax.set_xlabel(prop.replace("_", " ").title())
            ax.set_ylabel("Count")
            ax.set_title(f"{rule_name}\n({passed}/{len(values)} pass)", fontsize=11, fontweight="bold")
            ax.legend()

        fig.suptitle(title, fontsize=14, fontweight="bold", y=1.02)
        plt.tight_layout()

        return self._fig_to_bytes(fig)

    def save_png(
        self,
        chart_bytes: bytes,
        filepath: Union[str, Path],
    ) -> str:
        """
        Save chart bytes to PNG file.

        Args:
            chart_bytes: Chart image bytes.
            filepath: Output file path.

        Returns:
            Path to saved file.
        """
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, "wb") as f:
            f.write(chart_bytes)

        return str(filepath)


def create_pipeline_charts(
    results: Dict,
    output_dir: Union[str, Path],
    target_id: str,
) -> Dict[str, str]:
    """
    Generate all charts for pipeline results.

    Args:
        results: Pipeline results dictionary.
        output_dir: Output directory for charts.
        target_id: Target identifier for filenames.

    Returns:
        Dictionary mapping chart names to file paths.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    generator = ChartGenerator()
    saved_charts = {}

    # Pipeline summary
    try:
        summary_bytes = generator.pipeline_summary(results)
        summary_path = output_dir / f"{target_id}_pipeline_summary.png"
        generator.save_png(summary_bytes, summary_path)
        saved_charts["pipeline_summary"] = str(summary_path)
    except Exception as e:
        print(f"Warning: Could not generate pipeline summary chart: {e}")

    # QED distribution
    ligands = results.get("stages", {}).get("ligand_generation", {}).get("molecules", [])
    if ligands:
        try:
            qed_bytes = generator.qed_distribution(ligands)
            qed_path = output_dir / f"{target_id}_qed_distribution.png"
            generator.save_png(qed_bytes, qed_path)
            saved_charts["qed_distribution"] = str(qed_path)
        except Exception as e:
            print(f"Warning: Could not generate QED distribution chart: {e}")

    return saved_charts
