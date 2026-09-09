import React, { useState } from 'react';
import { IncidentData, ReportRole, LocationType } from '../types';
import { Send, MapPin, User, Calendar, Clock, FileText, Users } from 'lucide-react';
import { MEXICO_STATES } from '../constants';

interface Props {
  onSubmit: (data: IncidentData) => void;
}

export const IncidentForm: React.FC<Props> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<IncidentData>({
    reporter: ReportRole.DOCENTE,
    location: LocationType.AULA,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    state: MEXICO_STATES[0],
    description: '',
    involvedPersons: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert('Por favor describe los hechos.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-green-100/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Reporter */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <User size={16} className="text-green-600" /> ¿Quién reporta?
          </label>
          <select
            name="reporter"
            value={formData.reporter}
            onChange={handleChange}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          >
            {Object.values(ReportRole).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MapPin size={16} className="text-green-600" /> ¿Dónde ocurrió?
          </label>
          <select
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          >
            {Object.values(LocationType).map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Calendar size={16} className="text-green-600" /> Fecha del Incidente
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Time */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Clock size={16} className="text-green-600" /> Hora Aproximada
          </label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* State Selection */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MapPin size={16} className="text-green-600" /> Entidad Federativa
          </label>
          <select
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          >
            {MEXICO_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
            <option value="Federal">Otro (Normativa Federal)</option>
          </select>
        </div>

        {/* Involved Persons */}
        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Users size={16} className="text-green-600" /> Personas Involucradas (Nombres)
          </label>
          <input
            type="text"
            name="involvedPersons"
            placeholder="Ej. Juan Pérez (Alumno 3A), Prof. María (Docente)..."
            value={formData.involvedPersons}
            onChange={handleChange}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Description */}
        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <FileText size={16} className="text-green-600" /> Narración de los Hechos
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            placeholder="Describe detalladamente qué pasó, cómo pasó y qué se dijo. Sé objetivo y claro."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
          ></textarea>
          <p className="text-xs text-slate-500 text-right">La redacción clara ayuda a generar mejores documentos legales.</p>
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-600/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
        >
          <Send size={20} />
          Analizar e Iniciar Protocolo
        </button>
      </div>
    </form>
  );
};