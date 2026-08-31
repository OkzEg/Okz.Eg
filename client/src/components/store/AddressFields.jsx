import { EGYPT_GOVERNORATES } from '../../utils/helpers';

export default function AddressFields({
  values,
  onChange,
  inputClass = 'input',
  idPrefix = 'addr',
  compact = false,
}) {
  const field = (key) => (e) => onChange({ [key]: e.target.value });

  const onGovernorate = (e) => {
    const state = e.target.value;
    const patch = { state };
    if (compact || !values.city) patch.city = state;
    if (!values.country) patch.country = 'Egypt';
    onChange(patch);
  };

  const commonFields = (
    <>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-street`} className="label">
          Street Name
        </label>
        <input
          id={`${idPrefix}-street`}
          required
          autoComplete="street-address"
          className={inputClass}
          value={values.street || ''}
          onChange={field('street')}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-building`} className="label">
          Building Number / Name
        </label>
        <input
          id={`${idPrefix}-building`}
          required
          className={inputClass}
          value={values.building || ''}
          onChange={field('building')}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-apartment`} className="label">
          Apartment / Floor
        </label>
        <input
          id={`${idPrefix}-apartment`}
          required
          className={inputClass}
          value={values.apartment || ''}
          onChange={field('apartment')}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-additional`} className="label">
          Additional Information <span className="font-normal text-timber-400">(optional)</span>
        </label>
        <textarea
          id={`${idPrefix}-additional`}
          rows={2}
          className={`${inputClass} resize-y`}
          value={values.additionalInfo || ''}
          onChange={field('additionalInfo')}
          placeholder="Landmark, special instructions..."
        />
      </div>
    </>
  );

  if (compact) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${idPrefix}-state`} className="label">
            Governorate
          </label>
          <select
            id={`${idPrefix}-state`}
            required
            autoComplete="address-level1"
            className={inputClass}
            value={values.state || ''}
            onChange={onGovernorate}
          >
            <option value="" disabled>
              Select governorate
            </option>
            {values.state && !EGYPT_GOVERNORATES.includes(values.state) && (
              <option value={values.state}>{values.state}</option>
            )}
            {EGYPT_GOVERNORATES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {commonFields}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {commonFields}

      <div>
        <label htmlFor={`${idPrefix}-city`} className="label">
          City
        </label>
        <input
          id={`${idPrefix}-city`}
          required
          autoComplete="address-level2"
          className={inputClass}
          value={values.city || ''}
          onChange={field('city')}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-state`} className="label">
          Governorate
        </label>
        <select
          id={`${idPrefix}-state`}
          required
          autoComplete="address-level1"
          className={inputClass}
          value={values.state || ''}
          onChange={onGovernorate}
        >
          <option value="" disabled>
            Select governorate
          </option>
          {values.state && !EGYPT_GOVERNORATES.includes(values.state) && (
            <option value={values.state}>{values.state}</option>
          )}
          {EGYPT_GOVERNORATES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-zip`} className="label">
          Postal code <span className="font-normal text-timber-400">(optional)</span>
        </label>
        <input
          id={`${idPrefix}-zip`}
          autoComplete="postal-code"
          inputMode="numeric"
          className={inputClass}
          value={values.zip || ''}
          onChange={field('zip')}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-country`} className="label">
          Country
        </label>
        <input
          id={`${idPrefix}-country`}
          required
          autoComplete="country-name"
          className={inputClass}
          value={values.country || 'Egypt'}
          onChange={field('country')}
        />
      </div>
    </div>
  );
}
