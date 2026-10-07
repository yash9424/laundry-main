'use client'

import { useState, useEffect } from 'react'
import ResponsiveLayout from '../../components/ResponsiveLayout'
import Modal from '../../components/Modal'

export default function AddOnPage() {
  const [activeSection, setActiveSection] = useState('Pincode')
  const [states, setStates] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [pincodes, setPincodes] = useState<any[]>([])
  const [serviceableAreas, setServiceableAreas] = useState<any[]>([])
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedPincode, setSelectedPincode] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [vouchers, setVouchers] = useState<any[]>([])
  const [voucherCode, setVoucherCode] = useState('')
  const [discount, setDiscount] = useState('')
  const [slogan, setSlogan] = useState('')
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [slotTime, setSlotTime] = useState('')
  const [slotType, setSlotType] = useState('both')
  const [slotAvailableFor, setSlotAvailableFor] = useState('both')
  // Express runs its own shifts, so its windows are kept apart from Standard
  const [slotServiceType, setSlotServiceType] = useState('both')
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<any>(null)
  const [editingVoucher, setEditingVoucher] = useState<string | null>(null)
  const [walletSettings, setWalletSettings] = useState({
    minOrderPrice: 500,
    referralRewardAmount: 50,
    referredUserRewardAmount: 25
  })
  const [hubs, setHubs] = useState<any[]>([])
  const [hubForm, setHubForm] = useState({
    name: '',
    address: { street: '', city: '', state: '', pincode: [] as string[] },
    pincodes: [],
    contactPerson: '',
    contactNumber: ''
  })
  const [editingHub, setEditingHub] = useState<string | null>(null)
  const [hubState, setHubState] = useState('')
  const [hubCity, setHubCity] = useState('')
  const [hubCities, setHubCities] = useState<string[]>([])
  const [hubPincodes, setHubPincodes] = useState<any[]>([])
  const [selectedServicePincodes, setSelectedServicePincodes] = useState<string[]>([])
  const [toast, setToast] = useState({ show: false, message: '', type: '' })
  const [heroItems, setHeroItems] = useState<any[]>([])
  const [heroUrl, setHeroUrl] = useState('')
  const [heroType, setHeroType] = useState('image')
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [charges, setCharges] = useState({
    cancellationPercentage: 20,
    customerUnavailable: 150,
    incorrectAddress: 150,
    refusalToAccept: 150,
    cancellationPolicyText: '',
    expressDeliveryEnabled: true,
    expressDeliveryPrice: 0,
    expressDeliveryLabel: '',
    expressDeliveryDescription: '',
    expressTurnaroundHours: 12,
    standardTurnaroundHours: 24,
    expressCutoffHour: 18,
    expressLeadTimeMinutes: 90,
    orderIdSequential: false,
    orderIdPrefix: 'US',
    orderIdStart: 1001,
    invoiceGstNumber: '',
    invoiceSupportEmail: '',
    homeStandardTitle: '',
    homeStandardSubtitle: '',
    homeExpressTitle: '',
    homeExpressSubtitle: '',
    howToOrderTitle: '',
    howToOrderSteps: '',
    brandHeadingFont: 'Montserrat',
    brandBodyFont: 'Manrope',
    garmentCarePolicyText: '',
    damageLossPolicyText: '',
    pickupChecklistEnabled: true,
    pickupChecklistTitle: '',
    pickupChecklistIntro: '',
    pickupChecklistPoints: '',
    pickupChecklistNote: '',
    pickupImportantTitle: '',
    pickupImportantText: '',
    pickupSustainabilityTitle: '',
    pickupSustainabilityText: '',
    todaySlotsEnabled: true,
    tomorrowSlotsEnabled: true,
  })
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' })

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) setActiveSection(hash)
    fetchStates()
    fetchServiceableAreas()
    fetchVouchers()
    fetchTimeSlots()
    fetchWalletSettings()
    fetchHubs()
    fetchHeroItems()
    fetchCharges()
  }, [])

  const fetchCharges = async () => {
    const response = await fetch('/api/order-charges')
    const data = await response.json()
    if (data.success) setCharges(data.data)
  }

  const fetchHubs = async () => {
    const response = await fetch('/api/hubs')
    const data = await response.json()
    if (data.success) setHubs(data.data)
  }

  const fetchHeroItems = async () => {
    const response = await fetch('/api/hero-section')
    const data = await response.json()
    if (data.success) setHeroItems(data.data)
  }

  const addHeroItem = async () => {
    if (!heroUrl && !heroFile) return
    setUploading(true)
    
    try {
      let finalUrl = heroUrl
      if (heroFile) {
        const formData = new FormData()
        formData.append('file', heroFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        console.log('Upload response:', uploadData)
        if (uploadData.success) finalUrl = uploadData.url
        else throw new Error(uploadData.error || 'Upload failed')
      }
      
      console.log('Adding hero item with URL:', finalUrl)
      const response = await fetch('/api/hero-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: heroType, 
          url: finalUrl, 
          order: heroItems.length 
        })
      })
      
      if (response.ok) {
        setHeroUrl('')
        setHeroFile(null)
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        await fetchHeroItems()
        setModal({ isOpen: true, title: 'Success', message: 'Hero item added successfully!', type: 'success' })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add hero item')
      }
    } catch (error: any) {
      console.error('Error adding hero item:', error)
      setModal({ isOpen: true, title: 'Upload Failed', message: error.message || 'Failed to upload. Please try again.', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const removeHeroItem = async (id: string) => {
    const response = await fetch(`/api/hero-section?id=${id}`, { method: 'DELETE' })
    if (response.ok) fetchHeroItems()
  }

  const handleHubStateChange = (stateCode: string) => {
    setHubState(stateCode)
    setHubCity('')
    setHubPincodes([])
    setSelectedServicePincodes([])
    const cities = [...new Set(serviceableAreas.filter((a: any) => a.state === stateCode).map((a: any) => a.city))]
    setHubCities(cities)
  }

  const handleHubCityChange = (city: string) => {
    setHubCity(city)
    setSelectedServicePincodes([])
    const pincodes = serviceableAreas.filter((a: any) => a.state === hubState && a.city === city).map((a: any) => ({ pincode: a.pincode, area: a.area }))
    setHubPincodes(pincodes)
  }

  const addHub = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingHub ? `/api/hubs?id=${editingHub}` : '/api/hubs'
    const method = editingHub ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...hubForm,
        address: {
          ...hubForm.address,
          pincode: hubForm.address.pincode.length > 0 ? hubForm.address.pincode : selectedServicePincodes
        },
        pincodes: selectedServicePincodes
      })
    })
    if (response.ok) {
      fetchHubs()
      resetHubForm()
    }
  }

  const resetHubForm = () => {
    setHubForm({ name: '', address: { street: '', city: '', state: '', pincode: [] as string[] }, pincodes: [], contactPerson: '', contactNumber: '' })
    setHubState('')
    setHubCity('')
    setSelectedServicePincodes([])
    setEditingHub(null)
  }

  const editHub = (hub: any) => {
    setEditingHub(hub._id)
    setHubForm({
      name: hub.name,
      address: hub.address,
      pincodes: hub.pincodes,
      contactPerson: hub.contactPerson || '',
      contactNumber: hub.contactNumber || ''
    })
    setHubState(hub.address.state)
    setHubCity(hub.address.city)
    handleHubStateChange(hub.address.state)
    handleHubCityChange(hub.address.city)
    // Set both hub location pincodes and service pincodes
    setSelectedServicePincodes(hub.pincodes)
  }

  const deleteHub = async (id: string) => {
    if (confirm('Are you sure you want to delete this hub?')) {
      const response = await fetch(`/api/hubs?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchHubs()
    }
  }

  const fetchWalletSettings = async () => {
    try {
      const response = await fetch('/api/wallet-settings')
      const data = await response.json()
      if (data.success) {
        setWalletSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching wallet settings:', error)
    }
  }

  const saveWalletSettings = async () => {
    try {
      const { _id, __v, updatedAt, ...settingsToSave } = walletSettings as any
      console.log('Saving wallet settings:', settingsToSave)
      const response = await fetch('/api/wallet-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave)
      })
      const data = await response.json()
      console.log('Save response:', data)
      if (data.success) {
        await fetchWalletSettings()
        setToast({ show: true, message: 'Wallet settings saved successfully!', type: 'success' })
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000)
      }
    } catch (error) {
      console.error('Save error:', error)
      setToast({ show: true, message: 'Failed to save wallet settings', type: 'error' })
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000)
    }
  }

  const fetchStates = async () => {
    try {
      const response = await fetch('/api/locations/states')
      const data = await response.json()
      setStates(data)
    } catch (error) {
      console.error('Error fetching states:', error)
    }
  }

  const fetchCities = async (stateCode: string) => {
    try {
      const response = await fetch(`/api/locations/cities?state=${stateCode}`)
      const data = await response.json()
      setCities(data)
      setPincodes([])
      setSelectedCity('')
      setSelectedPincode('')
    } catch (error) {
      console.error('Error fetching cities:', error)
    }
  }

  const fetchPincodes = async (city: string) => {
    try {
      const response = await fetch(`/api/locations/pincodes?city=${city}`)
      const data = await response.json()
      setPincodes(data)
      setSelectedPincode('')
    } catch (error) {
      console.error('Error fetching pincodes:', error)
    }
  }

  const fetchServiceableAreas = async () => {
    try {
      const response = await fetch('/api/serviceable-areas')
      const data = await response.json()
      setServiceableAreas(data)
    } catch (error) {
      console.error('Error fetching serviceable areas:', error)
    }
  }

  const handleStateChange = (e: any) => {
    const stateCode = e.target.value
    setSelectedState(stateCode)
    if (e.target.tagName === 'SELECT') {
      setCities([])
      setPincodes([])
      setSelectedCity('')
      setSelectedPincode('')
      setSelectedArea('')
      if (stateCode) {
        fetchCities(stateCode)
      }
    }
  }

  const handleCityChange = (e: any) => {
    const city = e.target.value
    setSelectedCity(city)
    setPincodes([])
    setSelectedPincode('')
    setSelectedArea('')
    if (city) {
      fetchPincodes(city)
    }
  }

  const handlePincodeChange = (e: any) => {
    if (e.target.value) {
      const pincodeData = JSON.parse(e.target.value)
      setSelectedPincode(pincodeData.pincode)
      setSelectedArea(pincodeData.area)
    } else {
      setSelectedPincode('')
      setSelectedArea('')
    }
  }

  const addServiceableArea = async () => {
    if (!selectedState || !selectedCity || !selectedPincode) return
    
    try {
      const response = await fetch('/api/serviceable-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: selectedState,
          city: selectedCity,
          pincode: selectedPincode,
          area: selectedArea
        })
      })
      
      if (response.ok) {
        fetchServiceableAreas()
        setSelectedState('')
        setSelectedCity('')
        setSelectedPincode('')
        setSelectedArea('')
        setCities([])
        setPincodes([])
      }
    } catch (error) {
      console.error('Error adding serviceable area:', error)
    }
  }

  const removeServiceableArea = async (id: string) => {
    try {
      const response = await fetch(`/api/serviceable-areas?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchServiceableAreas()
      }
    } catch (error) {
      console.error('Error removing serviceable area:', error)
    }
  }

  const fetchVouchers = async () => {
    try {
      const response = await fetch('/api/vouchers')
      const data = await response.json()
      if (data.success) {
        setVouchers(data.data)
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error)
    }
  }

  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const addVoucher = async () => {
    if (!discount || !slogan) {
      console.log('Missing fields:', { discount, slogan })
      return
    }
    
    const autoCode = generateUniqueCode()
    
    console.log('Sending voucher data:', { code: autoCode, discount: Number(discount), slogan })
    
    try {
      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: autoCode, discount: Number(discount), slogan })
      })
      
      const result = await response.json()
      console.log('API response:', result)
      
      if (response.ok) {
        setDiscount('')
        setSlogan('')
        fetchVouchers()
      } else {
        console.error('API error:', result)
      }
    } catch (error) {
      console.error('Error adding voucher:', error)
    }
  }

  const removeVoucher = async (id: string) => {
    try {
      const response = await fetch(`/api/vouchers?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchVouchers()
      }
    } catch (error) {
      console.error('Error removing voucher:', error)
    }
  }

  const editVoucher = (voucher: any) => {
    setEditingVoucher(voucher._id)
    setDiscount(voucher.discount.toString())
    setSlogan(voucher.slogan)
  }

  const updateVoucher = async () => {
    if (!discount || !slogan || !editingVoucher) return
    
    const newCode = generateUniqueCode()
    
    try {
      const response = await fetch(`/api/vouchers?id=${editingVoucher}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCode, discount: Number(discount), slogan })
      })
      
      if (response.ok) {
        setDiscount('')
        setSlogan('')
        setEditingVoucher(null)
        fetchVouchers()
      }
    } catch (error) {
      console.error('Error updating voucher:', error)
    }
  }

  const cancelVoucherEdit = () => {
    setEditingVoucher(null)
    setDiscount('')
    setSlogan('')
  }

  const fetchTimeSlots = async () => {
    try {
      const response = await fetch('/api/time-slots?admin=true')
      const data = await response.json()
      if (data.success) {
        setTimeSlots(data.data)
      }
    } catch (error) {
      console.error('Error fetching time slots:', error)
    }
  }

  const addTimeSlot = async () => {
    if (!slotTime) return

    try {
      const response = await fetch('/api/time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: slotTime, type: slotType, availableFor: slotAvailableFor, serviceType: slotServiceType })
      })

      if (response.ok) {
        setSlotTime('')
        setSlotType('both')
        setSlotAvailableFor('both')
        fetchTimeSlots()
      }
    } catch (error) {
      console.error('Error adding time slot:', error)
    }
  }

  const removeTimeSlot = async (id: string) => {
    try {
      const response = await fetch(`/api/time-slots?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchTimeSlots()
    } catch (error) {
      console.error('Error removing time slot:', error)
    }
  }

  const toggleSlotActive = async (slot: any) => {
    try {
      await fetch(`/api/time-slots?id=${slot._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !slot.isActive })
      })
      fetchTimeSlots()
    } catch (error) {
      console.error('Error toggling slot:', error)
    }
  }

  const editTimeSlot = (slot: any) => {
    setEditingSlot(slot._id)
    setSlotTime(slot.time)
    setSlotType(slot.type)
    setSlotAvailableFor(slot.availableFor || 'both')
    setSlotServiceType(slot.serviceType || 'both')
  }

  const updateTimeSlot = async () => {
    if (!slotTime || !editingSlot) return

    try {
      const response = await fetch(`/api/time-slots?id=${editingSlot}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: slotTime, type: slotType, availableFor: slotAvailableFor, serviceType: slotServiceType })
      })

      if (response.ok) {
        setSlotTime('')
        setSlotType('both')
        setSlotAvailableFor('both')
        setEditingSlot(null)
        fetchTimeSlots()
      }
    } catch (error) {
      console.error('Error updating time slot:', error)
    }
  }

  const cancelEdit = () => {
    setEditingSlot(null)
    setSlotTime('')
    setSlotType('both')
    setSlotAvailableFor('both')
    setSlotServiceType('both')
  }

  const saveExpressEnabled = async (enabled: boolean) => {
    const previous = charges.expressDeliveryEnabled
    setCharges(prev => ({ ...prev, expressDeliveryEnabled: enabled }))
    try {
      const response = await fetch('/api/order-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressDeliveryEnabled: enabled })
      })
      if (!response.ok) throw new Error('save failed')
      setToast({ show: true, message: `Express Delivery turned ${enabled ? 'ON' : 'OFF'}`, type: 'success' })
    } catch (error) {
      setCharges(prev => ({ ...prev, expressDeliveryEnabled: previous }))
      setToast({ show: true, message: 'Could not update Express Delivery. Please try again.', type: 'error' })
    }
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000)
  }

  const saveDaySettings = async (todayEnabled: boolean, tomorrowEnabled: boolean) => {
    try {
      await fetch('/api/order-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...charges, todaySlotsEnabled: todayEnabled, tomorrowSlotsEnabled: tomorrowEnabled })
      })
      setCharges(prev => ({ ...prev, todaySlotsEnabled: todayEnabled, tomorrowSlotsEnabled: tomorrowEnabled }))
    } catch (error) {
      console.error('Error saving day settings:', error)
    }
  }

  const handleDragStart = (e: any, slot: any) => {
    setDraggedItem(slot)
  }

  const handleDragOver = (e: any) => {
    e.preventDefault()
  }

  const handleDrop = async (e: any, targetSlot: any) => {
    e.preventDefault()
    if (!draggedItem || draggedItem._id === targetSlot._id) return

    const newTimeSlots = [...timeSlots]
    const draggedIndex = newTimeSlots.findIndex(slot => slot._id === draggedItem._id)
    const targetIndex = newTimeSlots.findIndex(slot => slot._id === targetSlot._id)

    newTimeSlots.splice(draggedIndex, 1)
    newTimeSlots.splice(targetIndex, 0, draggedItem)

    setTimeSlots(newTimeSlots)
    setDraggedItem(null)

    // Update order in database
    try {
      const slotsWithOrder = newTimeSlots.map((slot, index) => ({
        id: slot._id,
        order: index
      }))
      
      await fetch('/api/time-slots/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotsWithOrder })
      })
    } catch (error) {
      console.error('Error updating slot order:', error)
      fetchTimeSlots() // Revert on error
    }
  }

  return (
    <ResponsiveLayout activePage="Add-On" title="Add-On Management">
      <div style={{ padding: '1.5rem' }}>
        {/* Header Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <button 
            onClick={() => {
              setActiveSection('Pincode')
              window.location.hash = 'Pincode'
            }}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: activeSection === 'Pincode' ? '#2563eb' : 'white', 
              color: activeSection === 'Pincode' ? 'white' : '#2563eb', 
              border: activeSection === 'Pincode' ? 'none' : '1px solid #2563eb', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Pincode
          </button>
          <button 
            onClick={() => {
              setActiveSection('Voucher')
              window.location.hash = 'Voucher'
            }}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: activeSection === 'Voucher' ? '#2563eb' : 'white', 
              color: activeSection === 'Voucher' ? 'white' : '#2563eb', 
              border: activeSection === 'Voucher' ? 'none' : '1px solid #2563eb', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Voucher
          </button>
          <button 
            onClick={() => {
              setActiveSection('TimeSlot')
              window.location.hash = 'TimeSlot'
            }}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: activeSection === 'TimeSlot' ? '#2563eb' : 'white', 
              color: activeSection === 'TimeSlot' ? 'white' : '#2563eb', 
              border: activeSection === 'TimeSlot' ? 'none' : '1px solid #2563eb', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Time Slot
          </button>
          <button 
            onClick={() => {
              setActiveSection('Wallet')
              window.location.hash = 'Wallet'
            }}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: activeSection === 'Wallet' ? '#2563eb' : 'white', 
              color: activeSection === 'Wallet' ? 'white' : '#2563eb', 
              border: activeSection === 'Wallet' ? 'none' : '1px solid #2563eb', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Wallet & Pricing
          </button>
          <button 
            onClick={() => {
              setActiveSection('Hub')
              window.location.hash = 'Hub'
            }}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: activeSection === 'Hub' ? '#2563eb' : 'white', 
              color: activeSection === 'Hub' ? 'white' : '#2563eb', 
              border: activeSection === 'Hub' ? 'none' : '1px solid #2563eb', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Hub
          </button>
          <button 
            onClick={() => {
              setActiveSection('Hero')
              window.location.hash = 'Hero'
            }}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: activeSection === 'Hero' ? '#2563eb' : 'white', 
              color: activeSection === 'Hero' ? 'white' : '#2563eb', 
              border: activeSection === 'Hero' ? 'none' : '1px solid #2563eb', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Hero Section
          </button>
          <button 
            onClick={() => {
              setActiveSection('Charges')
              window.location.hash = 'Charges'
            }}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: activeSection === 'Charges' ? '#2563eb' : 'white', 
              color: activeSection === 'Charges' ? 'white' : '#2563eb', 
              border: activeSection === 'Charges' ? 'none' : '1px solid #2563eb', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Order Charges
          </button>
        </div>

        {/* Pincode Management Section */}
        {activeSection === 'Pincode' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem', margin: '0 0 1rem 0' }}>Pincode Management</h3>
          
          {/* Auto-Fetch Section */}
          <div style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#0369a1', marginBottom: '0.75rem', margin: '0 0 0.75rem 0' }}>🔄 Auto-Fetch from API</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <select 
                aria-label="Select State"
                value={selectedState} 
                onChange={handleStateChange}
                style={{ padding: '0.75rem', border: '1px solid #0ea5e9', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}
              >
                <option value="">Select State</option>
                {states.map((state: any) => (
                  <option key={state.code} value={state.code}>{state.name}</option>
                ))}
              </select>
              
              <select 
                aria-label="Select City"
                value={selectedCity} 
                onChange={handleCityChange}
                disabled={!selectedState}
                style={{ padding: '0.75rem', border: '1px solid #0ea5e9', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}
              >
                <option value="">Select City</option>
                {cities.map((city: string) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              
              <select 
                aria-label="Select Pincode"
                value={selectedPincode ? JSON.stringify({pincode: selectedPincode, area: selectedArea}) : ''} 
                onChange={handlePincodeChange}
                disabled={!selectedCity}
                style={{ padding: '0.75rem', border: '1px solid #0ea5e9', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}
              >
                <option value="">Select Pincode</option>
                {pincodes.map((pincode: any) => (
                  <option key={pincode.pincode} value={JSON.stringify(pincode)}>
                    {pincode.pincode} - {pincode.area}
                  </option>
                ))}
              </select>
              
              <button 
                onClick={addServiceableArea}
                disabled={!selectedPincode}
                style={{ 
                  padding: '0.75rem', 
                  backgroundColor: selectedPincode ? '#0ea5e9' : '#9ca3af', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '0.9rem', 
                  fontWeight: '500',
                  cursor: selectedPincode ? 'pointer' : 'not-allowed'
                }}
              >
                Add Area
              </button>
            </div>
          </div>

          {/* Manual Entry Section */}
          <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#92400e', marginBottom: '0.75rem', margin: '0 0 0.75rem 0' }}>✍️ Manual Entry</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="State Code (e.g., WB)"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value.toUpperCase())}
                style={{ padding: '0.75rem', border: '1px solid #f59e0b', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}
              />
              <input 
                type="text" 
                placeholder="City Name"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{ padding: '0.75rem', border: '1px solid #f59e0b', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}
              />
              <input 
                type="text" 
                placeholder="Pincode"
                value={selectedPincode}
                onChange={(e) => setSelectedPincode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                style={{ padding: '0.75rem', border: '1px solid #f59e0b', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}
              />
              <input 
                type="text" 
                placeholder="Area Name"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                style={{ padding: '0.75rem', border: '1px solid #f59e0b', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}
              />
              <button 
                onClick={addServiceableArea}
                disabled={!selectedState || !selectedCity || !selectedPincode || !selectedArea}
                style={{ 
                  padding: '0.75rem', 
                  backgroundColor: (selectedState && selectedCity && selectedPincode && selectedArea) ? '#f59e0b' : '#9ca3af', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '0.9rem', 
                  fontWeight: '500',
                  cursor: (selectedState && selectedCity && selectedPincode && selectedArea) ? 'pointer' : 'not-allowed'
                }}
              >
                Add Manually
              </button>
            </div>
          </div>
          
          <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.75rem', margin: '0 0 0.75rem 0' }}>📍 Serviceable Areas ({serviceableAreas.length})</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem' }}>
            {serviceableAreas.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>No serviceable areas added yet</p>
            ) : (
              serviceableAreas.map((area: any) => (
                <div key={area._id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.5rem', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '6px', 
                  marginBottom: '0.5rem' 
                }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    {area.pincode} - {area.area}, {area.city}, {area.state}
                  </span>
                  <button 
                    onClick={() => removeServiceableArea(area._id)}
                    style={{ 
                      padding: '0.25rem 0.5rem', 
                      backgroundColor: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {/* Voucher Management Section */}
        {activeSection === 'Voucher' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem', margin: '0 0 1rem 0' }}>Voucher Management</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <input 
              type="number" 
              placeholder="Discount % (Backend Only)"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              style={{ padding: '0.75rem', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '12px', outline: 'none', fontSize: '0.9rem' }}
            />
            <input 
              type="text" 
              placeholder="Customer Display Text (e.g., Save 20% — New users)"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              style={{ padding: '0.75rem', backgroundColor: '#dcfce7', border: '1px solid #4ade80', borderRadius: '12px', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
            {editingVoucher ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={updateVoucher}
                  disabled={!discount || !slogan}
                  style={{ 
                    padding: '0.75rem', 
                    backgroundColor: discount && slogan ? '#10b981' : '#9ca3af', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontSize: '0.9rem', 
                    fontWeight: '500',
                    cursor: discount && slogan ? 'pointer' : 'not-allowed',
                    flex: 1
                  }}
                >
                  Update Voucher
                </button>
                <button 
                  onClick={cancelVoucherEdit}
                  style={{ 
                    padding: '0.75rem', 
                    backgroundColor: '#6b7280', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontSize: '0.9rem', 
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={addVoucher}
                disabled={!discount || !slogan}
                style={{ 
                  padding: '0.75rem', 
                  backgroundColor: discount && slogan ? '#2563eb' : '#9ca3af', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontSize: '0.9rem', 
                  fontWeight: '500',
                  cursor: discount && slogan ? 'pointer' : 'not-allowed'
                }}
              >
                Add Voucher
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0.5rem' }}>
            {vouchers.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem', width: '100%' }}>No vouchers created yet</p>
            ) : (
              vouchers.map((voucher: any) => (
                <div key={voucher._id} style={{ 
                  backgroundColor: '#dbeafe',
                  borderRadius: '16px',
                  padding: '1rem',
                  minWidth: '280px',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem', color: '#1e40af', margin: '0 0 0.25rem 0' }}>
                      {voucher.slogan}
                    </h3>
                    <p style={{ color: '#3b82f6', fontSize: '0.875rem', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>
                      Limited time offer
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem', margin: '0 0 0.25rem 0' }}>
                      Admin: {voucher.discount}% discount
                    </p>
                    <p style={{ color: '#059669', fontSize: '0.75rem', marginBottom: '0.5rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                      Code: {voucher.code}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button 
                        onClick={() => editVoucher(voucher)}
                        style={{
                          width: '80px',
                          height: '32px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => removeVoucher(voucher._id)}
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          backgroundColor: '#ef4444', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {/* Time Slot Management Section */}
        {activeSection === 'TimeSlot' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem', margin: '0 0 0.25rem 0' }}>Time Slot Management</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.25rem' }}>Manage pickup/delivery time slots for customers. Control availability per day.</p>

          {/* Master day toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: charges.todaySlotsEnabled ? '#f0fdf4' : '#fef2f2', border: `2px solid ${charges.todaySlotsEnabled ? '#22c55e' : '#ef4444'}`, borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937', margin: 0 }}>📅 Today Slots</p>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>{charges.todaySlotsEnabled ? 'Customers can book for today' : 'Today booking disabled'}</p>
              </div>
              <button
                onClick={() => saveDaySettings(!charges.todaySlotsEnabled, charges.tomorrowSlotsEnabled)}
                style={{ padding: '0.4rem 1rem', backgroundColor: charges.todaySlotsEnabled ? '#22c55e' : '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                {charges.todaySlotsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div style={{ backgroundColor: charges.tomorrowSlotsEnabled ? '#f0fdf4' : '#fef2f2', border: `2px solid ${charges.tomorrowSlotsEnabled ? '#22c55e' : '#ef4444'}`, borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937', margin: 0 }}>📆 Tomorrow Slots</p>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>{charges.tomorrowSlotsEnabled ? 'Customers can book for tomorrow' : 'Tomorrow booking disabled'}</p>
              </div>
              <button
                onClick={() => saveDaySettings(charges.todaySlotsEnabled, !charges.tomorrowSlotsEnabled)}
                style={{ padding: '0.4rem 1rem', backgroundColor: charges.tomorrowSlotsEnabled ? '#22c55e' : '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                {charges.tomorrowSlotsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Add / Edit slot form */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151', marginBottom: '0.75rem' }}>{editingSlot ? '✏️ Edit Slot' : '➕ Add New Slot'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                placeholder="Time (e.g. 9 AM - 11 AM)"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                style={{ padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }}
              />
              <select
                aria-label="Available For"
                value={slotAvailableFor}
                onChange={(e) => setSlotAvailableFor(e.target.value)}
                style={{ padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }}
              >
                <option value="both">Today & Tomorrow</option>
                <option value="today">Today Only</option>
                <option value="tomorrow">Tomorrow Only</option>
              </select>
              <select
                aria-label="Service Type"
                value={slotServiceType}
                onChange={(e) => setSlotServiceType(e.target.value)}
                style={{ padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }}
              >
                <option value="both">Standard &amp; Express</option>
                <option value="standard">Standard Only</option>
                <option value="express">Express Only</option>
              </select>
              <select
                aria-label="Slot Type"
                value={slotType}
                onChange={(e) => setSlotType(e.target.value)}
                style={{ padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }}
              >
                <option value="both">Pickup & Delivery</option>
                <option value="pickup">Pickup Only</option>
                <option value="delivery">Delivery Only</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {editingSlot ? (
                <>
                  <button onClick={updateTimeSlot} disabled={!slotTime} style={{ flex: 1, padding: '0.6rem', backgroundColor: slotTime ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: slotTime ? 'pointer' : 'not-allowed' }}>Update Slot</button>
                  <button onClick={cancelEdit} style={{ padding: '0.6rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
                </>
              ) : (
                <button onClick={addTimeSlot} disabled={!slotTime} style={{ flex: 1, padding: '0.6rem', backgroundColor: slotTime ? '#2563eb' : '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: slotTime ? 'pointer' : 'not-allowed' }}>Add Slot</button>
              )}
            </div>
          </div>

          {/* Today / Tomorrow slot panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {(['today', 'tomorrow'] as const).map((day) => {
              const daySlots = timeSlots.filter((s: any) => s.availableFor === day || s.availableFor === 'both')
              const dayEnabled = day === 'today' ? charges.todaySlotsEnabled : charges.tomorrowSlotsEnabled
              return (
                <div key={day} style={{ border: `1px solid ${dayEnabled ? '#e2e8f0' : '#fecaca'}`, borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '0.6rem 0.9rem', backgroundColor: dayEnabled ? '#f1f5f9' : '#fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1f2937' }}>{day === 'today' ? '📅 Today' : '📆 Tomorrow'} <span style={{ fontWeight: '400', color: '#6b7280' }}>({daySlots.length} slots)</span></span>
                    {!dayEnabled && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>DISABLED</span>}
                  </div>
                  <div style={{ padding: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                    {daySlots.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1.5rem 0', fontSize: '0.85rem' }}>No slots for {day}</p>
                    ) : (
                      daySlots.map((slot: any) => (
                        <div key={slot._id + '-' + day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.6rem', backgroundColor: slot.isActive ? 'white' : '#f9fafb', borderRadius: '6px', marginBottom: '0.4rem', border: `1px solid ${slot.isActive ? '#e2e8f0' : '#fecaca'}`, opacity: slot.isActive ? 1 : 0.7 }}>
                          <div>
                            <span style={{ fontWeight: '600', fontSize: '0.875rem', color: slot.isActive ? '#1f2937' : '#9ca3af' }}>{slot.time}</span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '0.4rem' }}>{slot.availableFor === 'both' ? 'both days' : slot.availableFor}</span>
                            {slot.serviceType && slot.serviceType !== 'both' && (
                              <span style={{ fontSize: '0.65rem', marginLeft: '0.4rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600, background: slot.serviceType === 'express' ? '#fef3c7' : '#e0e7ff', color: slot.serviceType === 'express' ? '#b45309' : '#3730a3' }}>
                                {slot.serviceType === 'express' ? 'EXPRESS' : 'STANDARD'}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <button onClick={() => toggleSlotActive(slot)} style={{ padding: '0.2rem 0.5rem', backgroundColor: slot.isActive ? '#22c55e' : '#9ca3af', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>
                              {slot.isActive ? 'ON' : 'OFF'}
                            </button>
                            <button onClick={() => editTimeSlot(slot)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => removeTimeSlot(slot._id)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )}

        {/* Wallet & Pricing Configuration Section */}
        {activeSection === 'Wallet' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#2563eb' }}>Wallet & Pricing Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Minimum Order Price (₹)</label>
              <input
                type="number"
                aria-label="Minimum Order Price"
                value={walletSettings.minOrderPrice}
                onChange={(e) => setWalletSettings({...walletSettings, minOrderPrice: Number(e.target.value)})}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Minimum order value required to place order</p>
            </div>
            <div style={{ gridColumn: '1 / -1', padding: '1rem', border: '2px dashed #2563eb', borderRadius: '10px', background: '#eff6ff' }}>
              <p style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1d4ed8', margin: '0 0 0.2rem' }}>Referral rewards</p>
              <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: '0 0 0.9rem' }}>
                Paid as wallet credit, and only once the referred friend has placed their first order —
                so nothing is given away for simply creating an account. Set either box to 0 to switch that side off.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>To the referrer (₹)</label>
                  <input
                    type="number" min="0" placeholder="50"
                    aria-label="Referral reward to the referrer"
                    value={walletSettings.referralRewardAmount}
                    onChange={(e) => setWalletSettings({...walletSettings, referralRewardAmount: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.7rem', border: '1px solid #93c5fd', borderRadius: '8px', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>To the new customer (₹)</label>
                  <input
                    type="number" min="0" placeholder="25"
                    aria-label="Referral reward to the new customer"
                    value={walletSettings.referredUserRewardAmount}
                    onChange={(e) => setWalletSettings({...walletSettings, referredUserRewardAmount: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.7rem', border: '1px solid #93c5fd', borderRadius: '8px', fontSize: '1rem' }}
                  />
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#1e40af', marginTop: '0.7rem' }}>
                Each referral currently costs ₹{(Number(walletSettings.referralRewardAmount) || 0) + (Number(walletSettings.referredUserRewardAmount) || 0)} in credit,
                and only after an order worth at least ₹{walletSettings.minOrderPrice} has been placed.
              </p>
            </div>
          </div>
          <button
            onClick={saveWalletSettings}
            style={{ marginTop: '1.5rem', padding: '0.75rem 2rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
          >
            Save Settings
          </button>
        </div>
        )}

        {/* Hub Management Section */}
        {activeSection === 'Hub' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem', margin: '0 0 1rem 0' }}>Hub Management</h3>
          
          <form onSubmit={addHub} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <input placeholder="Hub Name" value={hubForm.name} onChange={(e) => setHubForm({...hubForm, name: e.target.value})} required style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
              <input placeholder="Street" value={hubForm.address.street} onChange={(e) => setHubForm({...hubForm, address: {...hubForm.address, street: e.target.value}})} required style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
              <select aria-label="Select Hub State" value={hubState} onChange={(e) => { handleHubStateChange(e.target.value); setHubForm({...hubForm, address: {...hubForm.address, state: e.target.value}}); }} required style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }}>
                <option value="">Select State</option>
                {[...new Set(serviceableAreas.map((a: any) => a.state))].map((state: string) => <option key={state} value={state}>{state}</option>)}
              </select>
              <select aria-label="Select Hub City" value={hubCity} onChange={(e) => { handleHubCityChange(e.target.value); setHubForm({...hubForm, address: {...hubForm.address, city: e.target.value}}); }} disabled={!hubState} required style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }}>
                <option value="">Select City</option>
                {hubCities.map((city: string) => <option key={city} value={city}>{city}</option>)}
              </select>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Hub Location Pincodes (select multiple)</label>
                <select aria-label="Select Hub Pincodes" multiple value={hubForm.address.pincode} onChange={(e) => setHubForm({...hubForm, address: {...hubForm.address, pincode: Array.from(e.target.selectedOptions, option => option.value)}})} disabled={!hubCity} required style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%', minHeight: '80px' }}>
                  {hubPincodes.map((p: any) => <option key={p.pincode} value={p.pincode}>{p.pincode} - {p.area}</option>)}
                </select>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Hold Ctrl/Cmd to select multiple pincodes for hub location</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Service Pincodes (select multiple)</label>
                <select aria-label="Select Service Pincodes" multiple value={selectedServicePincodes} onChange={(e) => setSelectedServicePincodes(Array.from(e.target.selectedOptions, option => option.value))} disabled={!hubCity} required style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%', minHeight: '100px' }}>
                  {hubPincodes.map((p: any) => <option key={p.pincode} value={p.pincode}>{p.pincode} - {p.area}</option>)}
                </select>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Hold Ctrl/Cmd to select multiple pincodes</p>
              </div>
              <input placeholder="Contact Person" value={hubForm.contactPerson} onChange={(e) => setHubForm({...hubForm, contactPerson: e.target.value})} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
              <input placeholder="Contact Number" value={hubForm.contactNumber} onChange={(e) => setHubForm({...hubForm, contactNumber: e.target.value})} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" style={{ backgroundColor: editingHub ? '#10b981' : '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', flex: 1 }}>
                {editingHub ? 'Update Hub' : 'Add Hub'}
              </button>
              {editingHub && (
                <button type="button" onClick={resetHubForm} style={{ backgroundColor: '#6b7280', color: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {hubs.map((hub) => (
              <div key={hub._id} style={{ backgroundColor: editingHub === hub._id ? '#dbeafe' : '#f8fafc', padding: '1rem', borderRadius: '8px', border: editingHub === hub._id ? '2px solid #2563eb' : '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{hub.name}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => editHub(hub)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => deleteHub(hub._id)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>📍 {hub.address.street}, {hub.address.city}, {hub.address.state}</p>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.25rem' }}>Hub Locations: {Array.isArray(hub.address.pincode) ? hub.address.pincode.join(', ') : hub.address.pincode}</p>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.25rem' }}>Service Pincodes: {hub.pincodes.join(', ')}</p>
                {hub.contactPerson && <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.25rem' }}>Contact: {hub.contactPerson} - {hub.contactNumber}</p>}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Hero Section Management */}
        {activeSection === 'Hero' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem', margin: '0 0 1rem 0' }}>Hero Section Management</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>Upload File</label>
              <input 
                type="file" 
                aria-label="Upload Hero Image or Video"
                accept="image/*,video/*"
                onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>Or Enter URL</label>
              <input 
                type="text" 
                placeholder="Image/Video URL"
                value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value)}
                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>Type</label>
              <select 
                aria-label="Select Hero Type"
                value={heroType}
                onChange={(e) => setHeroType(e.target.value)}
                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>&nbsp;</label>
              <button 
                onClick={addHeroItem}
                disabled={(!heroUrl && !heroFile) || uploading}
                style={{ 
                  padding: '0.75rem', 
                  backgroundColor: (heroUrl || heroFile) && !uploading ? '#2563eb' : '#9ca3af', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '0.9rem', 
                  fontWeight: '500',
                  cursor: (heroUrl || heroFile) && !uploading ? 'pointer' : 'not-allowed',
                  width: '100%'
                }}
              >
                {uploading ? 'Uploading...' : 'Add Item'}
              </button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            {heroItems.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>No hero items added yet</p>
            ) : (
              heroItems.map((item: any) => (
                <div key={item._id} style={{ 
                  backgroundColor: '#f8fafc', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                    {item.type === 'image' ? (
                      <img src={item.url} alt="Hero" style={{ width: '150px', height: '90px', objectFit: 'cover', borderRadius: '6px', backgroundColor: '#f3f4f6' }} onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextElementSibling) (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }} />
                    ) : (
                      <video src={item.url} style={{ width: '150px', height: '90px', objectFit: 'cover', borderRadius: '6px', backgroundColor: '#f3f4f6' }} />
                    )}
                    <div style={{ display: 'none', width: '150px', height: '90px', backgroundColor: '#f3f4f6', borderRadius: '6px', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#6b7280' }}>Preview unavailable</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Type: {item.type}</p>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', wordBreak: 'break-all' }}>URL: {item.url}</p>
                    </div>
                    <button 
                      onClick={() => removeHeroItem(item._id)}
                      style={{ 
                        padding: '0.5rem 1rem', 
                        backgroundColor: '#ef4444', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        height: 'fit-content'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {/* Order Charges Management Section */}
        {activeSection === 'Charges' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem', margin: '0 0 1rem 0' }}>Order Charges Configuration</h3>
          
          {/* Cancellation Charge */}
          <div style={{ backgroundColor: '#fef3c7', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '2px solid #f59e0b' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#92400e', marginBottom: '1rem', margin: '0 0 1rem 0' }}>📋 Cancellation Charge (After Pickup Started)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center' }}>
              <label style={{ fontWeight: '500', color: '#78350f' }}>Charge Percentage:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input 
                  type="number" 
                  aria-label="Cancellation Charge Percentage"
                  value={charges.cancellationPercentage}
                  onChange={(e) => setCharges({...charges, cancellationPercentage: Number(e.target.value)})}
                  min="0"
                  max="100"
                  style={{ padding: '0.75rem', border: '2px solid #f59e0b', borderRadius: '8px', fontSize: '0.9rem', width: '120px' }}
                />
                <span style={{ fontWeight: '600', color: '#92400e' }}>% of order amount</span>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#78350f', marginTop: '0.75rem', backgroundColor: '#fef9c3', padding: '0.5rem', borderRadius: '6px' }}>
              💡 Example: If order amount is ₹500 and percentage is 20%, customer will be charged ₹100
            </p>
          </div>

          {/* Delivery Failure Charges */}
          <div style={{ backgroundColor: '#fee2e2', padding: '1.5rem', borderRadius: '12px', border: '2px solid #ef4444' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#991b1b', marginBottom: '1rem', margin: '0 0 1rem 0' }}>🚫 Delivery Failure Charges</h4>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px' }}>
                <label style={{ fontWeight: '500', color: '#7f1d1d' }}>Customer Unavailable:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: '#991b1b' }}>₹</span>
                  <input 
                    type="number" 
                    aria-label="Customer Unavailable Charge"
                    value={charges.customerUnavailable}
                    onChange={(e) => setCharges({...charges, customerUnavailable: Number(e.target.value)})}
                    min="0"
                    style={{ padding: '0.75rem', border: '2px solid #ef4444', borderRadius: '8px', fontSize: '0.9rem', width: '120px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px' }}>
                <label style={{ fontWeight: '500', color: '#7f1d1d' }}>Incorrect Address:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: '#991b1b' }}>₹</span>
                  <input 
                    type="number" 
                    aria-label="Incorrect Address Charge"
                    value={charges.incorrectAddress}
                    onChange={(e) => setCharges({...charges, incorrectAddress: Number(e.target.value)})}
                    min="0"
                    style={{ padding: '0.75rem', border: '2px solid #ef4444', borderRadius: '8px', fontSize: '0.9rem', width: '120px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px' }}>
                <label style={{ fontWeight: '500', color: '#7f1d1d' }}>Refusal to Accept:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: '#991b1b' }}>₹</span>
                  <input 
                    type="number" 
                    aria-label="Refusal to Accept Charge"
                    value={charges.refusalToAccept}
                    onChange={(e) => setCharges({...charges, refusalToAccept: Number(e.target.value)})}
                    min="0"
                    style={{ padding: '0.75rem', border: '2px solid #ef4444', borderRadius: '8px', fontSize: '0.9rem', width: '120px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Express / Priority Delivery */}
          <div style={{ backgroundColor: '#eff6ff', padding: '1.5rem', borderRadius: '12px', border: '2px solid #3b82f6', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1d4ed8', margin: 0 }}>⚡ Express Delivery (12 hours)</h4>
              <button
                type="button"
                onClick={() => saveExpressEnabled(!charges.expressDeliveryEnabled)}
                aria-label="Toggle Express Delivery"
                style={{ padding: '0.4rem 1.2rem', backgroundColor: charges.expressDeliveryEnabled ? '#22c55e' : '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                {charges.expressDeliveryEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.75rem' }}>Turn Express Delivery ON or OFF for customers, and set the extra charge per order. The ON/OFF switch saves immediately; the fee, label and info text save with "Save Charge Settings".</p>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#1d4ed8', marginBottom: '0.4rem' }}>Toggle Label (shown next to the switch in customer app)</label>
              <input
                type="text"
                placeholder="e.g. Express Delivery (12 hours)"
                value={(charges as any).expressDeliveryLabel || ''}
                onChange={(e) => setCharges({ ...charges, expressDeliveryLabel: e.target.value } as any)}
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #3b82f6', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontWeight: '600', color: '#1d4ed8', fontSize: '1.1rem' }}>₹</span>
              <input
                type="number"
                min="0"
                aria-label="Express Delivery Price"
                value={charges.expressDeliveryPrice}
                onChange={(e) => setCharges({ ...charges, expressDeliveryPrice: Number(e.target.value) })}
                style={{ padding: '0.75rem', border: '2px solid #3b82f6', borderRadius: '8px', fontSize: '0.9rem', width: '150px' }}
              />
              <span style={{ color: '#1e40af', fontSize: '0.9rem' }}>per order</span>
            </div>
            {!charges.expressDeliveryEnabled ? (
              <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '0.5rem', fontWeight: '500' }}>
                ⛔ Express Delivery is OFF. Customers only see Standard Delivery.
              </p>
            ) : charges.expressDeliveryPrice > 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#1d4ed8', marginTop: '0.5rem', fontWeight: '500' }}>
                ✅ Express Delivery is ON. Customers pay +₹{charges.expressDeliveryPrice} per order.
              </p>
            ) : (
              <p style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '0.5rem', fontWeight: '500' }}>
                ⚠️ Express Delivery is ON with no extra charge (₹0). Use the OFF switch to hide it from customers.
              </p>
            )}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#1d4ed8', marginBottom: '0.4rem' }}>ℹ️ Info Popup Text (shown when user taps the info icon)</label>
              <textarea
                value={charges.expressDeliveryDescription}
                onChange={(e) => setCharges({ ...charges, expressDeliveryDescription: e.target.value })}
                placeholder={`e.g. Your clothes will be delivered within 12 hours of pickup. Extra charges apply.`}
                rows={3}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #3b82f6', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Delivery turnaround + invoice details */}
          <div style={{ backgroundColor: '#fefce8', padding: '1.5rem', borderRadius: '12px', border: '2px solid #eab308', marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#a16207', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>⏱️ Delivery Turnaround &amp; Invoice Details</h4>
            <p style={{ fontSize: '0.8rem', color: '#854d0e', marginBottom: '0.75rem' }}>The delivery deadline is counted from the moment the captain marks the order picked up. Changing these affects new pickups only — orders already picked up keep the deadline they were given.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#a16207', marginBottom: '0.4rem' }}>Express turnaround (hours)</label>
                <input
                  type="number" min="1" placeholder="12"
                  value={charges.expressTurnaroundHours}
                  onChange={(e) => setCharges({ ...charges, expressTurnaroundHours: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #eab308', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#a16207', marginBottom: '0.4rem' }}>Standard turnaround (hours)</label>
                <input
                  type="number" min="1" placeholder="24"
                  value={charges.standardTurnaroundHours}
                  onChange={(e) => setCharges({ ...charges, standardTurnaroundHours: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #eab308', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', padding: '0.85rem', border: '2px dashed #eab308', borderRadius: '10px', background: '#fffbeb' }}>
                <p style={{ fontWeight: '700', fontSize: '0.85rem', color: '#a16207', margin: '0 0 0.2rem' }}>Express same-day rules</p>
                <p style={{ fontSize: '0.75rem', color: '#92400e', margin: '0 0 0.7rem' }}>
                  After {charges.expressCutoffHour > 12 ? charges.expressCutoffHour - 12 : charges.expressCutoffHour}
                  {charges.expressCutoffHour >= 12 ? ' PM' : ' AM'} the customer can no longer book Express for today,
                  and any Express slot must start at least {charges.expressLeadTimeMinutes} minutes ahead so the captain can reach them.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#a16207', marginBottom: '0.3rem' }}>Same-day cut-off (hour, 24h)</label>
                    <input
                      type="number" min="0" max="23" placeholder="18"
                      value={charges.expressCutoffHour}
                      onChange={(e) => setCharges({ ...charges, expressCutoffHour: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.6rem', border: '2px solid #eab308', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#a16207', marginBottom: '0.3rem' }}>Minimum lead time (minutes)</label>
                    <input
                      type="number" min="0" placeholder="90"
                      value={charges.expressLeadTimeMinutes}
                      onChange={(e) => setCharges({ ...charges, expressLeadTimeMinutes: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.6rem', border: '2px solid #eab308', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', padding: '0.85rem', border: '2px dashed #eab308', borderRadius: '10px', background: '#fffbeb' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.85rem', color: '#a16207' }}>
                  <input
                    type="checkbox"
                    checked={!!charges.orderIdSequential}
                    onChange={(e) => setCharges({ ...charges, orderIdSequential: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Use sequential order numbers
                </label>
                <p style={{ fontSize: '0.75rem', color: '#92400e', margin: '0.35rem 0 0.6rem' }}>
                  Off: random codes like ILKGB. On: {(charges.orderIdPrefix || 'US')}{charges.orderIdStart || 1001}, then {(charges.orderIdPrefix || 'US')}{(Number(charges.orderIdStart) || 1001) + 1}, and so on. Orders already placed keep the number they have.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#a16207', marginBottom: '0.3rem' }}>Prefix</label>
                    <input
                      type="text" placeholder="US" maxLength={6}
                      value={charges.orderIdPrefix}
                      onChange={(e) => setCharges({ ...charges, orderIdPrefix: e.target.value.toUpperCase() })}
                      disabled={!charges.orderIdSequential}
                      style={{ width: '100%', padding: '0.6rem', border: '2px solid #eab308', borderRadius: '8px', fontSize: '0.9rem', opacity: charges.orderIdSequential ? 1 : 0.5 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#a16207', marginBottom: '0.3rem' }}>Start from</label>
                    <input
                      type="number" min="1" placeholder="1001"
                      value={charges.orderIdStart}
                      onChange={(e) => setCharges({ ...charges, orderIdStart: Number(e.target.value) })}
                      disabled={!charges.orderIdSequential}
                      style={{ width: '100%', padding: '0.6rem', border: '2px solid #eab308', borderRadius: '8px', fontSize: '0.9rem', opacity: charges.orderIdSequential ? 1 : 0.5 }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#a16207', marginBottom: '0.4rem' }}>GST number (on invoices)</label>
                <input
                  type="text" placeholder="29ACLFAA519M1ZW"
                  value={charges.invoiceGstNumber}
                  onChange={(e) => setCharges({ ...charges, invoiceGstNumber: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #eab308', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#a16207', marginBottom: '0.4rem' }}>Support email (on invoices)</label>
                <input
                  type="email" placeholder="support@urbansteam.in"
                  value={charges.invoiceSupportEmail}
                  onChange={(e) => setCharges({ ...charges, invoiceSupportEmail: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #eab308', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          {/* Customer app wording: Home buttons + How To Order */}
          <div style={{ backgroundColor: '#f5f3ff', padding: '1.5rem', borderRadius: '12px', border: '2px solid #8b5cf6', marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#6d28d9', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>📱 Customer App Wording (Home buttons &amp; How To Order)</h4>
            <p style={{ fontSize: '0.8rem', color: '#5b21b6', marginBottom: '0.75rem' }}>Leave a box empty to keep the current wording. Saves with "Save Charge Settings" below.</p>

            <p style={{ fontWeight: '700', fontSize: '0.85rem', color: '#6d28d9', margin: '0 0 0.5rem 0' }}>Home screen — the two delivery buttons</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#6d28d9', marginBottom: '0.3rem' }}>Standard button — title</label>
                <input type="text" placeholder="Standard Delivery" value={charges.homeStandardTitle}
                  onChange={(e) => setCharges({ ...charges, homeStandardTitle: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', border: '2px solid #8b5cf6', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '0.5rem' }} />
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#6d28d9', marginBottom: '0.3rem' }}>Standard button — small text</label>
                <input type="text" placeholder="24-hour turnaround" value={charges.homeStandardSubtitle}
                  onChange={(e) => setCharges({ ...charges, homeStandardSubtitle: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid #8b5cf6', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#6d28d9', marginBottom: '0.3rem' }}>Express button — title</label>
                <input type="text" placeholder="Express Delivery" value={charges.homeExpressTitle}
                  onChange={(e) => setCharges({ ...charges, homeExpressTitle: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', border: '2px solid #8b5cf6', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '0.5rem' }} />
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#6d28d9', marginBottom: '0.3rem' }}>Express button — small text</label>
                <input type="text" placeholder="12-hour turnaround — for a small fee" value={charges.homeExpressSubtitle}
                  onChange={(e) => setCharges({ ...charges, homeExpressSubtitle: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid #8b5cf6', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
            </div>

            <p style={{ fontWeight: '700', fontSize: '0.85rem', color: '#6d28d9', margin: '0 0 0.5rem 0' }}>"How To Order" popup (catalogue page)</p>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#6d28d9', marginBottom: '0.3rem' }}>Popup heading</label>
            <input type="text" placeholder="How To Order" value={charges.howToOrderTitle}
              onChange={(e) => setCharges({ ...charges, howToOrderTitle: e.target.value })}
              style={{ width: '100%', padding: '0.65rem', border: '2px solid #8b5cf6', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '0.6rem' }} />
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#6d28d9', marginBottom: '0.3rem' }}>
              Steps — one per line, written as <strong>Title | Description</strong>. Steps are numbered automatically, so add or remove lines freely.
            </label>
            <textarea rows={6} value={charges.howToOrderSteps}
              onChange={(e) => setCharges({ ...charges, howToOrderSteps: e.target.value })}
              placeholder={'Choose Your Garments | Count your garments and tap "+" to add them.\nReview Your Cart | Tap Cart below and check your order.\nPick a Slot & Pay | Choose your pickup slot and complete payment.\nRelax | We\'ll take care of the rest.'}
              style={{ width: '100%', padding: '0.75rem', border: '2px solid #8b5cf6', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* Brand typography */}
          <div style={{ backgroundColor: '#fdf2f8', padding: '1.5rem', borderRadius: '12px', border: '2px solid #ec4899', marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#be185d', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>🔤 Brand Fonts (Customer, Captain &amp; Admin apps)</h4>
            <p style={{ fontSize: '0.8rem', color: '#9d174d', marginBottom: '0.75rem' }}>Any <a href="https://fonts.google.com" target="_blank" rel="noreferrer" style={{ color: '#be185d', fontWeight: '600' }}>Google Font</a> name works. Changing this updates all three apps the next time they load — no app update needed. If a name is wrong or the font cannot load, the apps fall back to Montserrat / Manrope automatically.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#be185d', marginBottom: '0.4rem' }}>Heading font (titles &amp; buttons)</label>
                <input
                  type="text" list="google-font-suggestions" placeholder="Montserrat"
                  value={charges.brandHeadingFont}
                  onChange={(e) => setCharges({ ...charges, brandHeadingFont: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #ec4899', borderRadius: '8px', fontSize: '0.9rem' }}
                />
                <p style={{ marginTop: '0.5rem', fontSize: '1.05rem', fontWeight: '700', color: '#1f2937', fontFamily: `'${charges.brandHeadingFont || 'Montserrat'}', sans-serif` }}>Urban Steam — Book Order</p>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#be185d', marginBottom: '0.4rem' }}>Body font (normal text)</label>
                <input
                  type="text" list="google-font-suggestions" placeholder="Manrope"
                  value={charges.brandBodyFont}
                  onChange={(e) => setCharges({ ...charges, brandBodyFont: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #ec4899', borderRadius: '8px', fontSize: '0.9rem' }}
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: '#374151', fontFamily: `'${charges.brandBodyFont || 'Manrope'}', sans-serif` }}>Your clothes, steam ironed and delivered in 12 hours.</p>
              </div>
            </div>
            <datalist id="google-font-suggestions">
              {['Montserrat', 'Manrope', 'Poppins', 'Inter', 'Lato', 'Nunito', 'Raleway', 'Work Sans', 'DM Sans', 'Plus Jakarta Sans', 'Outfit', 'Rubik'].map(f => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>

          {/* Checkout policy popups */}
          <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '2px solid #0ea5e9', marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#0369a1', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>📄 Garment Care &amp; Damage/Loss Policies (checkout popups)</h4>
            <p style={{ fontSize: '0.8rem', color: '#075985', marginBottom: '0.75rem' }}>These open when the customer taps the links under the garment-care note at checkout. <strong>Leave a box empty</strong> and that link keeps showing the matching section of the Terms &amp; Conditions page, exactly as it does today. Paste the approved legal wording here once you have it — no app update needed.</p>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#0369a1', marginBottom: '0.4rem' }}>Garment Care Policy</label>
              <textarea rows={6} value={charges.garmentCarePolicyText}
                onChange={(e) => setCharges({ ...charges, garmentCarePolicyText: e.target.value })}
                placeholder="Empty = shows Terms section 5 (Garment Care and Processing)"
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #0ea5e9', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#0369a1', marginBottom: '0.4rem' }}>Damage / Loss Policy</label>
              <textarea rows={6} value={charges.damageLossPolicyText}
                onChange={(e) => setCharges({ ...charges, damageLossPolicyText: e.target.value })}
                placeholder="Empty = shows Terms section 6 (Limitation of Liability for Damaged or Lost Items)"
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #0ea5e9', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>

          {/* "Before your pickup" card shown in the customer app */}
          <div style={{ backgroundColor: '#faf5ff', padding: '1.5rem', borderRadius: '12px', border: '2px solid #a855f7', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#7e22ce', margin: 0 }}>🧺 "Before Your Pickup" Card (shown in customer app)</h4>
              <button
                type="button"
                onClick={() => setCharges({ ...charges, pickupChecklistEnabled: !charges.pickupChecklistEnabled })}
                aria-label="Toggle pickup checklist"
                style={{ padding: '0.4rem 1.2rem', backgroundColor: charges.pickupChecklistEnabled ? '#22c55e' : '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                {charges.pickupChecklistEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b21a8', marginBottom: '0.75rem' }}>Appears on the Order Confirmation screen and on Track Order until the captain collects the clothes. Save with "Save Charge Settings" below.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#7e22ce', marginBottom: '0.4rem' }}>Card heading</label>
                <input type="text" placeholder="Before your pickup" value={charges.pickupChecklistTitle}
                  onChange={(e) => setCharges({ ...charges, pickupChecklistTitle: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #a855f7', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#7e22ce', marginBottom: '0.4rem' }}>Intro line</label>
                <input type="text" placeholder="For a smooth pickup, please ensure that:" value={charges.pickupChecklistIntro}
                  onChange={(e) => setCharges({ ...charges, pickupChecklistIntro: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #a855f7', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#7e22ce', marginBottom: '0.4rem' }}>Checklist points — one per line (each line gets a tick)</label>
              <textarea rows={4} value={charges.pickupChecklistPoints}
                onChange={(e) => setCharges({ ...charges, pickupChecklistPoints: e.target.value })}
                placeholder={"The garment quantities match your booking.\nGarments are added under the correct categories.\nThe garments are kept ready as per your booking."}
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #a855f7', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#7e22ce', marginBottom: '0.4rem' }}>Note under the checklist</label>
              <textarea rows={2} value={charges.pickupChecklistNote}
                onChange={(e) => setCharges({ ...charges, pickupChecklistNote: e.target.value })}
                placeholder="Our pickup team will collect only the garments included in the confirmed booking."
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #a855f7', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ backgroundColor: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#b45309', marginBottom: '0.4rem' }}>⚠️ Warning block — heading</label>
              <input type="text" placeholder="Important" value={charges.pickupImportantTitle}
                onChange={(e) => setCharges({ ...charges, pickupImportantTitle: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid #fbbf24', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '0.5rem' }} />
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#b45309', marginBottom: '0.4rem' }}>Warning block — text (leave empty to hide)</label>
              <textarea rows={3} value={charges.pickupImportantText}
                onChange={(e) => setCharges({ ...charges, pickupImportantText: e.target.value })}
                placeholder="Urban Steam does not take responsibility for cash, jewellery..."
                style={{ width: '100%', padding: '0.6rem', border: '1px solid #fbbf24', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#15803d', marginBottom: '0.4rem' }}>♻️ Green block — heading</label>
              <input type="text" placeholder="A small step towards sustainable service" value={charges.pickupSustainabilityTitle}
                onChange={(e) => setCharges({ ...charges, pickupSustainabilityTitle: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid #4ade80', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '0.5rem' }} />
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#15803d', marginBottom: '0.4rem' }}>Green block — text (leave empty to hide)</label>
              <textarea rows={3} value={charges.pickupSustainabilityText}
                onChange={(e) => setCharges({ ...charges, pickupSustainabilityText: e.target.value })}
                placeholder="If the paper inside your garments is still clean and usable..."
                style={{ width: '100%', padding: '0.6rem', border: '1px solid #4ade80', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>

          {/* Full Cancellation Policy Text */}
          <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: '12px', border: '2px solid #22c55e', marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#15803d', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>📝 Cancellation Policy Text (shown in user app)</h4>
            <p style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.75rem' }}>Whatever you type here will appear exactly in the "View Cancellation Policy" section in the customer app. Use line breaks to separate sections.</p>
            <textarea
              value={charges.cancellationPolicyText}
              onChange={(e) => setCharges({ ...charges, cancellationPolicyText: e.target.value })}
              placeholder={`Example:\n1. No fee if cancelled before pickup partner is assigned.\n\n2. After pickup partner is assigned, a 20% cancellation fee applies.\n\n3. If delivery fails:\n- Customer Unavailable: ₹150\n- Incorrect Address: ₹150\n- Refusal to Accept: ₹150`}
              rows={10}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #22c55e', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <button
            onClick={async () => {
              const response = await fetch('/api/order-charges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(charges)
              });
              if (response.ok) {
                await fetchCharges();
                setToast({ show: true, message: 'Charges saved successfully!', type: 'success' });
                setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
              }
            }}
            style={{ 
              marginTop: '1.5rem', 
              padding: '0.75rem 2rem', 
              backgroundColor: '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '1rem', 
              fontWeight: '600', 
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Save Charge Settings
          </button>
        </div>
        )}

        {toast.show && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>{toast.message}</span>
            <button onClick={() => setToast({ show: false, message: '', type: '' })} style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0 0.25rem'
            }}>×</button>
          </div>
        )}

        <Modal
          isOpen={modal.isOpen}
          onClose={() => setModal({ ...modal, isOpen: false })}
          title={modal.title}
          message={modal.message}
          type={modal.type}
        />
      </div>
    </ResponsiveLayout>
  )
}