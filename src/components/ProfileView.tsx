import React, { useState } from 'react';
import { CheckCircle2, MapPin, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HYDERABAD_LOCATIONS } from '../utils/geo';

export const ProfileView: React.FC = () => {
  const { currentUser, updateProfile } = useApp();
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [name, setName] = useState(currentUser?.name ?? '');
  const [ngoName, setNgoName] = useState(currentUser?.ngoName ?? '');
  const [contactPerson, setContactPerson] = useState(currentUser?.contactPerson ?? '');
  const [registrationId, setRegistrationId] = useState(currentUser?.registrationId ?? '');
  const [description, setDescription] = useState(currentUser?.description ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [address, setAddress] = useState(currentUser?.address ?? '');
  const [city, setCity] = useState(currentUser?.city ?? '');
  const [stateName, setStateName] = useState(currentUser?.state ?? '');
  const [lat, setLat] = useState(currentUser?.lat ?? 17.385);
  const [lng, setLng] = useState(currentUser?.lng ?? 78.4867);

  if (!currentUser) return null;

  const handlePreset = (idxStr: string) => {
    const loc = HYDERABAD_LOCATIONS[Number(idxStr)];
    if (!loc) return;
    setAddress(loc.address);
    setCity(loc.city);
    setStateName(loc.state);
    setLat(loc.lat);
    setLng(loc.lng);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedMsg('');

    if (!phone.trim() || !address.trim() || !city.trim() || !stateName.trim()) {
      setErrorMsg('Please complete all required contact and location fields.');
      return;
    }
    if (currentUser.role === 'NGO' && (!ngoName.trim() || !contactPerson.trim())) {
      setErrorMsg('NGO name and contact person are required.');
      return;
    }

    updateProfile(currentUser.id, {
      name: currentUser.role === 'NGO' ? ngoName.trim() : name.trim(),
      ngoName: currentUser.role === 'NGO' ? ngoName.trim() : undefined,
      contactPerson: currentUser.role === 'NGO' ? contactPerson.trim() : undefined,
      registrationId: currentUser.role === 'NGO' ? registrationId.trim() : undefined,
      description: currentUser.role === 'NGO' ? description.trim() : undefined,
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: stateName.trim(),
      lat: Number(lat),
      lng: Number(lng),
    });
    setSavedMsg('Profile changes saved and synchronized across active records.');
  };

  return (
    <div className="max-w-3xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
      <div className="mb-6 pb-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">
          {currentUser.role === 'NGO' ? 'NGO Organization Profile' : 'Account Profile'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Coordinates and address details are used by the ILP matching engine to minimize transit distance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentUser.role === 'NGO' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  NGO Name
                </label>
                <input
                  type="text"
                  value={ngoName}
                  onChange={(e) => setNgoName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  NGO Registration ID
                </label>
                <input
                  type="text"
                  value={registrationId}
                  onChange={(e) => setRegistrationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address (Read-only)
            </label>
            <input
              type="email"
              value={currentUser.email}
              disabled
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>
        </div>

        {currentUser.role === 'NGO' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Organization Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <MapPin className="w-4 h-4 text-[#059669]" />
              <span>Location & Geocoded Hub</span>
            </div>
            <select
              onChange={(e) => handlePreset(e.target.value)}
              defaultValue=""
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
            >
              <option value="" disabled>
                Quick-fill Hyderabad Hub...
              </option>
              {HYDERABAD_LOCATIONS.map((loc, i) => (
                <option key={loc.label} value={i}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                State
              </label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm font-mono-nums border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm font-mono-nums border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {errorMsg}
          </div>
        )}
        {savedMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
