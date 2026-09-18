import * as LocationStore from '../state/LocationStore.js';
import { PRESET_LOCATIONS } from '../config/locations.js';
import { lookupElevation } from '../services/ElevationService.js';

export class LocationDialog {
  /**
   * @param {{dialogEl, selectEl, customRowEl, nameEl, latEl, lonEl, cancelBtn, saveBtn}} els
   */
  constructor(els) {
    this.els = els;

    PRESET_LOCATIONS.forEach((loc, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = loc.name;
      this.els.selectEl.appendChild(opt);
    });
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'מיקום מותאם אישית…';
    this.els.selectEl.appendChild(customOpt);

    this.els.selectEl.addEventListener('change', () => {
      this.els.customRowEl.hidden = this.els.selectEl.value !== 'custom';
    });
    this.els.cancelBtn.addEventListener('click', () => this.els.dialogEl.close());
    this.els.saveBtn.addEventListener('click', () => this._handleSave());
  }

  open() {
    const loc = LocationStore.getLocation();
    const idx = PRESET_LOCATIONS.findIndex(l => l.name === loc.name && l.lat === loc.lat && l.lon === loc.lon);
    if (idx >= 0) {
      this.els.selectEl.value = String(idx);
      this.els.customRowEl.hidden = true;
    } else {
      this.els.selectEl.value = 'custom';
      this.els.customRowEl.hidden = false;
      this.els.nameEl.value = loc.name;
      this.els.latEl.value = loc.lat;
      this.els.lonEl.value = loc.lon;
    }
    this.els.dialogEl.showModal();
  }

  async _handleSave() {
    let loc;
    if (this.els.selectEl.value === 'custom') {
      const name = this.els.nameEl.value.trim() || 'מיקום מותאם אישית';
      const lat = parseFloat(this.els.latEl.value);
      const lon = parseFloat(this.els.lonEl.value);
      if (!isFinite(lat) || !isFinite(lon)) {
        alert('נא להזין קו רוחב וקו אורך תקינים');
        return;
      }
      // Look up real elevation (meters) so zmanim use "visible" sunrise/sunset here too.
      const elevation = (await lookupElevation(lat, lon)) ?? 0;
      loc = { name, lat, lon, elevation };
    } else {
      loc = PRESET_LOCATIONS[parseInt(this.els.selectEl.value, 10)];
    }
    LocationStore.setLocation(loc);
    this.els.dialogEl.close();
  }
}
