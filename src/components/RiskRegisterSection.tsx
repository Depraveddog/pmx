"use client";

import "../theme.css";

type Risk = {
  id: string;
  description: string;
  category: string;
  impact: "Low" | "Medium" | "High";
  probability: "Low" | "Medium" | "High";
  response: string;
  owner: string;
};

interface RiskRegisterSectionProps {
  risks: Risk[];
}

function RiskRegisterSection({ risks }: RiskRegisterSectionProps) {
  if (!risks.length) return null;

  const badgeClass = (level: string) => {
    if (level === "High") return "risk-badge high";
    if (level === "Medium") return "risk-badge medium";
    return "risk-badge low";
  };

  return (
    <div className="section list-box risk-box">
      <h2 className="risk-title">Project Risk Register</h2>
      <p className="risk-subtitle">
        Key risks, impacts, and high-level responses based on your project inputs.
      </p>

      <div className="risk-table-wrapper">
        <table className="risk-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Risk</th>
              <th>Category</th>
              <th>Impact</th>
              <th>Probability</th>
              <th>Response</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((risk) => (
              <tr key={risk.id}>
                <td>{risk.id}</td>
                <td>{risk.description}</td>
                <td>{risk.category}</td>
                <td><span className={badgeClass(risk.impact)}>{risk.impact}</span></td>
                <td><span className={badgeClass(risk.probability)}>{risk.probability}</span></td>
                <td>{risk.response}</td>
                <td>{risk.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RiskRegisterSection;
