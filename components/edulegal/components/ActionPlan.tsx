import React from 'react';
import { AnalysisResult } from '../types';
import { UserCheck, Shield, GraduationCap, Users } from 'lucide-react';

interface Props {
  analysis: AnalysisResult;
}

export const ActionPlan: React.FC<Props> = ({ analysis }) => {
  const getIcon = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('docente') || r.includes('maestro')) return <GraduationCap className="text-blue-500" size={24} />;
    if (r.includes('director') || r.includes('autoridad')) return <Shield className="text-purple-500" size={24} />;
    if (r.includes('padres') || r.includes('tutor')) return <Users className="text-orange-500" size={24} />;
    return <UserCheck className="text-green-500" size={24} />;
  };

  // Agrupar acciones por rol
  const groupedPlan = analysis.actionPlan.reduce((acc, current) => {
    const existing = acc.find(item => item.role === current.role);
    if (existing) {
      existing.actions = [...existing.actions, ...current.actions];
    } else {
      acc.push({ ...current });
    }
    return acc;
  }, [] as typeof analysis.actionPlan);

  // Función para formatear citas en negrita y pequeño
  const formatAction = (text: string) => {
    // Busca patrones tipo (Doc: ..., Art: ...)
    const regex = /\(Doc:.*?, Art:.*?\)/g;
    const parts = text.split(regex);
    const matches = text.match(regex);

    if (!matches) return <span>{text}</span>;

    return (
      <span>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {matches[i] && (
              <span className="legal-cite ml-1 inline-block">
                {matches[i]}
              </span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {groupedPlan.map((step, idx) => (
        <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="p-2 bg-slate-50 rounded-lg">
              {getIcon(step.role)}
            </div>
            <h3 className="font-bold text-lg text-slate-800">{step.role}</h3>
          </div>
          <ul className="space-y-4">
            {step.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 text-sm leading-relaxed">
                <span className="min-w-[8px] h-[8px] rounded-full bg-green-500 mt-1.5 shadow-sm shadow-green-200"></span>
                <span className="flex-1">{formatAction(action)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};