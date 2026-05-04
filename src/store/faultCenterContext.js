import { defineStore } from 'pinia'
import { faultCenterList, unwrapW8t } from '@/api/faultcenter'

const LS_FC = 'syswatch_fault_center_id'

export const useFaultCenterContextStore = defineStore('faultCenterContext', {
  state: () => ({
    /** @type {{ id: string, name?: string }[]} */
    centers: [],
    currentFaultCenterId: localStorage.getItem(LS_FC) || '',
    loading: false,
    error: ''
  }),
  actions: {
    setCurrentFaultCenterId(id) {
      this.currentFaultCenterId = id || ''
      if (id) localStorage.setItem(LS_FC, id)
      else localStorage.removeItem(LS_FC)
    },
    async loadCenters() {
      this.error = ''
      this.loading = true
      try {
        const res = await faultCenterList({})
        const data = unwrapW8t(res)
        this.centers = Array.isArray(data) ? data : []
        if (
          this.centers.length &&
          !this.centers.some((c) => c.id === this.currentFaultCenterId)
        ) {
          this.setCurrentFaultCenterId(this.centers[0].id)
        }
      } catch (e) {
        this.centers = []
        this.error = e?.message || '加载故障中心失败'
      } finally {
        this.loading = false
      }
    }
  }
})
