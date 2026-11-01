/**
 * @file member-management.test.tsx
 * @description 会员管理模块集成测试 - 会员列表、等级管理、积分系统、权益管理等功能
 * @module __tests__/integration
 * @author YYC³
 * @version 1.0.0
 * @created 2025-01-06
 * @updated 2025-01-06
 */

// Jest 全局：describe/it/expect/beforeEach/afterEach；原 vitest 导入已清理（协同规范 05 §6 治理②）
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// 🧪 测试配置
const TEST_CONFIG = {
  INITIAL_MEMBERS: [
    {
      id: 'MEMBER-2025-001',
      memberId: 'MB-001',
      name: '张三',
      email: 'zhangsan@example.com',
      phone: '13800138001',
      gender: 'male',
      birthDate: '1990-05-15',
      registrationDate: '2024-01-15T10:00:00Z',
      status: 'active',
      tierId: 'TIER-GOLD',
      tierName: '黄金会员',
      tierColor: '#FFD700',
      points: 8500,
      totalSpent: 25999.99,
      orderCount: 15,
      lastOrderDate: '2025-01-05T14:30:00Z',
      avatar: 'https://example.com/avatar1.jpg',
      preferences: {
        newsletter: true,
        smsNotifications: true,
        emailNotifications: true,
        preferredLanguage: 'zh-CN',
        preferredCurrency: 'CNY'
      },
      address: {
        street: '北京市朝阳区建国路88号',
        city: '北京',
        province: '北京市',
        zipCode: '100000',
        country: '中国'
      },
      socialMedia: {
        wechat: 'zhangsan001',
        qq: '123456789',
        weibo: '@张三'
      },
      tags: ['VIP客户', '电子产品爱好者', '高价值客户'],
      notes: '客户对产品质量要求较高，需要特别注意售后服务',
      isVerified: true,
      source: 'website',
      referralCode: 'REF001',
      referredBy: null,
      lastLoginAt: '2025-01-06T09:00:00Z',
      loginCount: 45
    },
    {
      id: 'MEMBER-2025-002',
      memberId: 'MB-002',
      name: '李四',
      email: 'lisi@example.com',
      phone: '13800138002',
      gender: 'female',
      birthDate: '1985-08-22',
      registrationDate: '2024-03-20T14:15:00Z',
      status: 'active',
      tierId: 'TIER-SILVER',
      tierName: '白银会员',
      tierColor: '#C0C0C0',
      points: 3200,
      totalSpent: 8999.99,
      orderCount: 8,
      lastOrderDate: '2024-12-20T16:45:00Z',
      avatar: 'https://example.com/avatar2.jpg',
      preferences: {
        newsletter: true,
        smsNotifications: false,
        emailNotifications: true,
        preferredLanguage: 'zh-CN',
        preferredCurrency: 'CNY'
      },
      address: {
        street: '上海市浦东新区陆家嘴环路1000号',
        city: '上海',
        province: '上海市',
        zipCode: '200000',
        country: '中国'
      },
      socialMedia: {
        wechat: 'lisi002',
        qq: '987654321',
        weibo: '@李四'
      },
      tags: ['时尚达人', '美妆爱好者'],
      notes: '',
      isVerified: true,
      source: 'mobile_app',
      referralCode: 'REF002',
      referredBy: 'MEMBER-2025-001',
      lastLoginAt: '2025-01-05T20:30:00Z',
      loginCount: 32
    },
    {
      id: 'MEMBER-2025-003',
      memberId: 'MB-003',
      name: '王五',
      email: 'wangwu@example.com',
      phone: '13800138003',
      gender: 'male',
      birthDate: '1995-12-10',
      registrationDate: '2024-11-10T09:30:00Z',
      status: 'inactive',
      tierId: 'TIER-BRONZE',
      tierName: '青铜会员',
      tierColor: '#CD7F32',
      points: 800,
      totalSpent: 1599.99,
      orderCount: 2,
      lastOrderDate: '2024-11-15T11:20:00Z',
      avatar: 'https://example.com/avatar3.jpg',
      preferences: {
        newsletter: false,
        smsNotifications: false,
        emailNotifications: false,
        preferredLanguage: 'zh-CN',
        preferredCurrency: 'CNY'
      },
      address: {
        street: '广州市天河区珠江新城花城大道85号',
        city: '广州',
        province: '广东省',
        zipCode: '510000',
        country: '中国'
      },
      socialMedia: {
        wechat: 'wangwu003',
        qq: null,
        weibo: '@王五'
      },
      tags: ['新用户'],
      notes: '',
      isVerified: false,
      source: 'website',
      referralCode: 'REF003',
      referredBy: null,
      lastLoginAt: '2024-11-15T15:00:00Z',
      loginCount: 5
    },
    {
      id: 'MEMBER-2025-004',
      memberId: 'MB-004',
      name: '赵六',
      email: 'zhaoliu@example.com',
      phone: '13800138004',
      gender: 'female',
      birthDate: '1988-03-28',
      registrationDate: '2023-08-05T13:45:00Z',
      status: 'active',
      tierId: 'TIER-DIAMOND',
      tierName: '钻石会员',
      tierColor: '#B9F2FF',
      points: 25000,
      totalSpent: 89999.99,
      orderCount: 45,
      lastOrderDate: '2025-01-04T10:15:00Z',
      avatar: 'https://example.com/avatar4.jpg',
      preferences: {
        newsletter: true,
        smsNotifications: true,
        emailNotifications: true,
        preferredLanguage: 'zh-CN',
        preferredCurrency: 'CNY'
      },
      address: {
        street: '深圳市南山区科技园南区深南大道9988号',
        city: '深圳',
        province: '广东省',
        zipCode: '518000',
        country: '中国'
      },
      socialMedia: {
        wechat: 'zhaoliu004',
        qq: '555666777',
        weibo: '@赵六'
      },
      tags: ['企业客户', '电子产品专家', '忠实客户', '推荐人'],
      notes: '企业采购负责人，订单金额较大，享有特殊优惠政策',
      isVerified: true,
      source: 'website',
      referralCode: 'REF004',
      referredBy: null,
      lastLoginAt: '2025-01-06T08:45:00Z',
      loginCount: 156
    }
  ],
  MEMBER_TIERS: [
    {
      id: 'TIER-BRONZE',
      name: '青铜会员',
      color: '#CD7F32',
      minPoints: 0,
      minSpent: 0,
      maxPoints: 999,
      maxSpent: 4999.99,
      benefits: ['基础积分奖励', '生日优惠券'],
      requirements: '注册即可获得'
    },
    {
      id: 'TIER-SILVER',
      name: '白银会员',
      color: '#C0C0C0',
      minPoints: 1000,
      minSpent: 5000.00,
      maxPoints: 4999,
      maxSpent: 24999.99,
      benefits: ['积分奖励翻倍', '生日优惠券', '专属客服', '免费配送'],
      requirements: '累计消费满5000元或积分达到1000'
    },
    {
      id: 'TIER-GOLD',
      name: '黄金会员',
      color: '#FFD700',
      minPoints: 5000,
      minSpent: 25000.00,
      maxPoints: 9999,
      maxSpent: 49999.99,
      benefits: ['积分奖励三倍', '生日礼品', '专属客服', '免费配送', '优先客服', '退货优先'],
      requirements: '累计消费满25000元或积分达到5000'
    },
    {
      id: 'TIER-DIAMOND',
      name: '钻石会员',
      color: '#B9F2FF',
      minPoints: 10000,
      minSpent: 50000.00,
      maxPoints: null,
      maxSpent: null,
      benefits: ['积分奖励五倍', '生日礼品', '专属客服', '免费配送', '优先客服', '退货优先', '专属活动', 'VIP专属产品'],
      requirements: '累计消费满50000元或积分达到10000'
    }
  ],
  MEMBER_STATUSES: [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '活跃会员' },
    { value: 'inactive', label: '非活跃会员' },
    { value: 'suspended', label: '已暂停' },
    { value: 'banned', label: '已封禁' }
  ],
  GENDER_OPTIONS: [
    { value: 'male', label: '男' },
    { value: 'female', label: '女' },
    { value: 'other', label: '其他' }
  ],
  SOURCES: [
    { value: 'website', label: '官网注册' },
    { value: 'mobile_app', label: '移动应用' },
    { value: 'offline', label: '线下门店' },
    { value: 'referral', label: '推荐注册' },
    { value: 'social_media', label: '社交媒体' }
  ]
}

// 🎭 模拟会员管理页面组件
const createMockMemberManagementPage = () => {
  const MockMemberManagementPage: React.FC = () => {
    const [members, setMembers] = React.useState(TEST_CONFIG.INITIAL_MEMBERS)
    const [selectedMembers, setSelectedMembers] = React.useState<Set<string>>(new Set())
    const [showMemberDetailModal, setShowMemberDetailModal] = React.useState(false)
    const [showEditModal, setShowEditModal] = React.useState(false)
    const [showTierModal, setShowTierModal] = React.useState(false)
    const [showAddMemberModal, setShowAddMemberModal] = React.useState(false)
    const [selectedMember, setSelectedMember] = React.useState<any>(null)
    const [editingMember, setEditingMember] = React.useState<any>(null)
    const [tierEditingMember, setTierEditingMember] = React.useState<any>(null)
    const [filters, setFilters] = React.useState({
      search: '',
      memberId: '',
      name: '',
      email: '',
      phone: '',
      status: 'all',
      tierId: 'all',
      gender: 'all',
      source: 'all',
      dateRange: { start: '', end: '' },
      pointsRange: { min: '', max: '' },
      spentRange: { min: '', max: '' }
    })
    const [sortBy, setSortBy] = React.useState('registrationDate')
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
    const [currentPage, setCurrentPage] = React.useState(1)
    const itemsPerPage = 10

    // 过滤和排序逻辑
    const filteredMembers = members
      .filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                            member.email.toLowerCase().includes(filters.search.toLowerCase()) ||
                            member.memberId.toLowerCase().includes(filters.search.toLowerCase()) ||
                            member.phone.includes(filters.search)
        
        const matchesMemberId = filters.memberId === '' || 
                               member.memberId.toLowerCase().includes(filters.memberId.toLowerCase())
        
        const matchesName = filters.name === '' || 
                           member.name.toLowerCase().includes(filters.name.toLowerCase())
        
        const matchesEmail = filters.email === '' || 
                            member.email.toLowerCase().includes(filters.email.toLowerCase())
        
        const matchesPhone = filters.phone === '' || 
                            member.phone.includes(filters.phone)
        
        const matchesStatus = filters.status === 'all' || member.status === filters.status
        const matchesTier = filters.tierId === 'all' || member.tierId === filters.tierId
        const matchesGender = filters.gender === 'all' || member.gender === filters.gender
        const matchesSource = filters.source === 'all' || member.source === filters.source
        
        const matchesDateRange = 
          (filters.dateRange.start === '' || member.registrationDate >= filters.dateRange.start) &&
          (filters.dateRange.end === '' || member.registrationDate <= filters.dateRange.end)
        
        const matchesPointsRange = 
          (filters.pointsRange.min === '' || member.points >= parseInt(filters.pointsRange.min)) &&
          (filters.pointsRange.max === '' || member.points <= parseInt(filters.pointsRange.max))
        
        const matchesSpentRange = 
          (filters.spentRange.min === '' || member.totalSpent >= parseFloat(filters.spentRange.min)) &&
          (filters.spentRange.max === '' || member.totalSpent <= parseFloat(filters.spentRange.max))
        
        return matchesSearch && matchesMemberId && matchesName && matchesEmail && matchesPhone &&
               matchesStatus && matchesTier && matchesGender && matchesSource &&
               matchesDateRange && matchesPointsRange && matchesSpentRange
      })
      .sort((a, b) => {
        const aVal = a[sortBy as keyof typeof a]
        const bVal = b[sortBy as keyof typeof b]
        const modifier = sortOrder === 'asc' ? 1 : -1
        return aVal > bVal ? modifier : -modifier
      })

    // 分页逻辑
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
    const paginatedMembers = filteredMembers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )

    const handleFilterChange = (key: string, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }))
      setCurrentPage(1)
    }

    const handleSort = (field: string) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setSortBy(field)
        setSortOrder('asc')
      }
    }

    const handleSelectMember = (memberId: string) => {
      const newSelected = new Set(selectedMembers)
      if (newSelected.has(memberId)) {
        newSelected.delete(memberId)
      } else {
        newSelected.add(memberId)
      }
      setSelectedMembers(newSelected)
    }

    const handleSelectAll = () => {
      if (selectedMembers.size === paginatedMembers.length) {
        setSelectedMembers(new Set())
      } else {
        setSelectedMembers(new Set(paginatedMembers.map(m => m.id)))
      }
    }

    const handleViewMemberDetail = (member: any) => {
      setSelectedMember(member)
      setShowMemberDetailModal(true)
    }

    const handleEditMember = (member: any) => {
      setEditingMember({ ...member })
      setShowEditModal(true)
    }

    const handleChangeTier = (member: any) => {
      setTierEditingMember({ ...member })
      setShowTierModal(true)
    }

    const handleUpdateMember = (updatedMember: any) => {
      setMembers(prev => prev.map(member => 
        member.id === updatedMember.id ? { ...member, ...updatedMember } : member
      ))
    }

    const handleUpdateTier = (memberId: string, newTierId: string) => {
      const tier = TEST_CONFIG.MEMBER_TIERS.find(t => t.id === newTierId)
      if (tier) {
        setMembers(prev => prev.map(member => 
          member.id === memberId ? { 
            ...member, 
            tierId: newTierId,
            tierName: tier.name,
            tierColor: tier.color
          } : member
        ))
      }
    }

    const handleUpdateMemberStatus = (memberId: string, newStatus: string) => {
      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, status: newStatus } : member
      ))
    }

    const handleDeleteMember = (memberId: string) => {
      if (confirm('确定要删除此会员吗？此操作不可恢复。')) {
        setMembers(prev => prev.filter(member => member.id !== memberId))
      }
    }

    const handleBatchUpdateStatus = (newStatus: string) => {
      if (confirm(`确定要将选中的 ${selectedMembers.size} 个会员状态更新为 "${newStatus}" 吗？`)) {
        selectedMembers.forEach(memberId => {
          handleUpdateMemberStatus(memberId, newStatus)
        })
        setSelectedMembers(new Set())
      }
    }

    const handleBatchChangeTier = (newTierId: string) => {
      if (confirm(`确定要将选中的 ${selectedMembers.size} 个会员等级更新吗？`)) {
        selectedMembers.forEach(memberId => {
          handleUpdateTier(memberId, newTierId)
        })
        setSelectedMembers(new Set())
      }
    }

    const handleAddMember = (newMember: any) => {
      const memberId = `MEMBER-${Date.now()}`
      const memberNumber = `MB-${String(members.length + 1).padStart(3, '0')}`
      const member = {
        ...newMember,
        id: memberId,
        memberId: memberNumber,
        registrationDate: new Date().toISOString(),
        lastLoginAt: null,
        loginCount: 0,
        isVerified: false
      }
      setMembers(prev => [...prev, member])
    }

    const getTierInfo = (tierId: string) => {
      return TEST_CONFIG.MEMBER_TIERS.find(tier => tier.id === tierId)
    }

    const getStatusText = (status: string) => {
      const statusMap = {
        active: '活跃',
        inactive: '非活跃',
        suspended: '已暂停',
        banned: '已封禁'
      }
      return statusMap[status as keyof typeof statusMap] || status
    }

    const getStatusClass = (status: string) => {
      const classMap = {
        active: 'status-active',
        inactive: 'status-inactive',
        suspended: 'status-suspended',
        banned: 'status-banned'
      }
      return classMap[status as keyof typeof classMap] || 'status-default'
    }

    const getSourceText = (source: string) => {
      const sourceMap = {
        website: '官网注册',
        mobile_app: '移动应用',
        offline: '线下门店',
        referral: '推荐注册',
        social_media: '社交媒体'
      }
      return sourceMap[source as keyof typeof sourceMap] || source
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }

    const calculateAge = (birthDate: string) => {
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    const getMemberStats = () => {
      const total = members.length
      const active = members.filter(m => m.status === 'active').length
      const inactive = members.filter(m => m.status === 'inactive').length
      const totalPoints = members.reduce((sum, m) => sum + m.points, 0)
      const totalSpent = members.reduce((sum, m) => sum + m.totalSpent, 0)
      const avgSpent = total > 0 ? totalSpent / total : 0
      const avgPoints = total > 0 ? totalPoints / total : 0
      
      return { total, active, inactive, totalPoints, totalSpent, avgSpent, avgPoints }
    }

    const stats = getMemberStats()

    return (
      <div data-testid="member-management-page" className="member-management-container">
        {/* 页面标题和操作栏 */}
        <div className="page-header">
          <h1 data-testid="page-title">会员管理</h1>
          <div className="page-actions">
            <button onClick={() => setShowAddMemberModal(true)} data-testid="add-member-btn">
              添加会员
            </button>
            <button onClick={() => console.log('导出会员')} data-testid="export-btn">
              导出会员
            </button>
            <button onClick={() => console.log('批量导入')} data-testid="import-btn">
              批量导入
            </button>
          </div>
        </div>

        {/* 会员统计 */}
        <div className="stats-section" data-testid="stats-section">
          <div className="stat-card">
            <h3>总会员数</h3>
            <span className="stat-value" data-testid="total-members">{stats.total}</span>
          </div>
          <div className="stat-card">
            <h3>活跃会员</h3>
            <span className="stat-value text-success" data-testid="active-members">{stats.active}</span>
          </div>
          <div className="stat-card">
            <h3>非活跃会员</h3>
            <span className="stat-value text-warning" data-testid="inactive-members">{stats.inactive}</span>
          </div>
          <div className="stat-card">
            <h3>总积分</h3>
            <span className="stat-value text-info" data-testid="total-points">{stats.totalPoints.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <h3>总消费额</h3>
            <span className="stat-value text-success" data-testid="total-spent">¥{stats.totalSpent.toFixed(2)}</span>
          </div>
          <div className="stat-card">
            <h3>平均消费</h3>
            <span className="stat-value text-info" data-testid="avg-spent">¥{stats.avgSpent.toFixed(2)}</span>
          </div>
        </div>

        {/* 过滤和搜索栏 */}
        <div className="filters-section" data-testid="filters-section">
          <div className="search-row">
            <div className="search-box">
              <input
                type="text"
                placeholder="搜索会员姓名、邮箱、会员号或手机号"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                data-testid="search-input"
              />
            </div>
          </div>

          <div className="filter-controls">
            <div className="filter-group">
              <label>会员号:</label>
              <input
                type="text"
                placeholder="会员号"
                value={filters.memberId}
                onChange={(e) => handleFilterChange('memberId', e.target.value)}
                data-testid="member-id-filter"
              />
            </div>

            <div className="filter-group">
              <label>姓名:</label>
              <input
                type="text"
                placeholder="姓名"
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                data-testid="name-filter"
              />
            </div>

            <div className="filter-group">
              <label>邮箱:</label>
              <input
                type="email"
                placeholder="邮箱"
                value={filters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
                data-testid="email-filter"
              />
            </div>

            <div className="filter-group">
              <label>手机号:</label>
              <input
                type="tel"
                placeholder="手机号"
                value={filters.phone}
                onChange={(e) => handleFilterChange('phone', e.target.value)}
                data-testid="phone-filter"
              />
            </div>

            <div className="filter-group">
              <label>状态:</label>
              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                data-testid="status-filter"
              >
                {TEST_CONFIG.MEMBER_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>会员等级:</label>
              <select 
                value={filters.tierId}
                onChange={(e) => handleFilterChange('tierId', e.target.value)}
                data-testid="tier-filter"
              >
                <option value="all">全部等级</option>
                {TEST_CONFIG.MEMBER_TIERS.map(tier => (
                  <option key={tier.id} value={tier.id}>{tier.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="advanced-filters">
            <div className="filter-group">
              <label>性别:</label>
              <select 
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                data-testid="gender-filter"
              >
                <option value="all">全部</option>
                {TEST_CONFIG.GENDER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>来源:</label>
              <select 
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                data-testid="source-filter"
              >
                {TEST_CONFIG.SOURCES.map(source => (
                  <option key={source.value} value={source.value}>{source.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>注册日期:</label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                data-testid="date-start-filter"
              />
              <span>至</span>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                data-testid="date-end-filter"
              />
            </div>

            <div className="filter-group">
              <label>积分范围:</label>
              <input
                type="number"
                placeholder="最低积分"
                value={filters.pointsRange.min}
                onChange={(e) => handleFilterChange('pointsRange', { ...filters.pointsRange, min: e.target.value })}
                data-testid="points-min-filter"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="最高积分"
                value={filters.pointsRange.max}
                onChange={(e) => handleFilterChange('pointsRange', { ...filters.pointsRange, max: e.target.value })}
                data-testid="points-max-filter"
              />
            </div>

            <div className="filter-group">
              <label>消费额范围:</label>
              <input
                type="number"
                placeholder="最低消费"
                value={filters.spentRange.min}
                onChange={(e) => handleFilterChange('spentRange', { ...filters.spentRange, min: e.target.value })}
                data-testid="spent-min-filter"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="最高消费"
                value={filters.spentRange.max}
                onChange={(e) => handleFilterChange('spentRange', { ...filters.spentRange, max: e.target.value })}
                data-testid="spent-max-filter"
              />
            </div>

            <button 
              onClick={() => setFilters({
                search: '',
                memberId: '',
                name: '',
                email: '',
                phone: '',
                status: 'all',
                tierId: 'all',
                gender: 'all',
                source: 'all',
                dateRange: { start: '', end: '' },
                pointsRange: { min: '', max: '' },
                spentRange: { min: '', max: '' }
              })}
              data-testid="clear-filters-btn"
            >
              清除筛选
            </button>
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedMembers.size > 0 && (
          <div className="batch-actions" data-testid="batch-actions">
            <span>已选中 {selectedMembers.size} 个会员</span>
            <div className="batch-buttons">
              <button 
                onClick={() => handleBatchUpdateStatus('active')}
                data-testid="batch-activate-btn"
              >
                批量激活
              </button>
              <button 
                onClick={() => handleBatchUpdateStatus('inactive')}
                data-testid="batch-deactivate-btn"
              >
                批量停用
              </button>
              <button 
                onClick={() => handleBatchChangeTier('TIER-SILVER')}
                data-testid="batch-change-tier-btn"
              >
                批量升级
              </button>
            </div>
          </div>
        )}

        {/* 会员列表 */}
        <div className="members-table-container" data-testid="members-table-container">
          <table className="members-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedMembers.size === paginatedMembers.length && paginatedMembers.length > 0}
                    onChange={handleSelectAll}
                    data-testid="select-all-checkbox"
                  />
                </th>
                <th onClick={() => handleSort('memberId')} data-testid="sort-member-id">
                  会员号 {sortBy === 'memberId' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('name')} data-testid="sort-name">
                  会员信息 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('tierId')} data-testid="sort-tier">
                  会员等级 {sortBy === 'tierId' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('points')} data-testid="sort-points">
                  积分 {sortBy === 'points' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('totalSpent')} data-testid="sort-spent">
                  消费额 {sortBy === 'totalSpent' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('orderCount')} data-testid="sort-orders">
                  订单数 {sortBy === 'orderCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('status')} data-testid="sort-status">
                  状态 {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('lastLoginAt')} data-testid="sort-last-login">
                  最后登录 {sortBy === 'lastLoginAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.map(member => (
                <tr key={member.id} data-testid={`member-row-${member.id}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedMembers.has(member.id)}
                      onChange={() => handleSelectMember(member.id)}
                      data-testid={`member-checkbox-${member.id}`}
                    />
                  </td>
                  <td>
                    <div className="member-id" data-testid={`member-id-${member.id}`}>
                      {member.memberId}
                    </div>
                    {member.isVerified && (
                      <span className="verified-badge" data-testid={`verified-${member.id}`}>
                        ✓ 已验证
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="member-info">
                      <div className="member-avatar">
                        <img src={member.avatar} alt={member.name} />
                      </div>
                      <div className="member-details">
                        <div className="member-name" data-testid={`member-name-${member.id}`}>
                          {member.name}
                        </div>
                        <div className="member-contact">
                          <span data-testid={`member-email-${member.id}`}>{member.email}</span>
                          <br />
                          <span data-testid={`member-phone-${member.id}`}>{member.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="tier-info">
                      <span 
                        className="tier-badge"
                        style={{ backgroundColor: member.tierColor }}
                        data-testid={`tier-badge-${member.id}`}
                      >
                        {member.tierName}
                      </span>
                      <button
                        onClick={() => handleChangeTier(member)}
                        data-testid={`change-tier-btn-${member.id}`}
                        className="btn-small btn-secondary"
                      >
                        更换等级
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="points-info">
                      <div className="points-value" data-testid={`points-${member.id}`}>
                        {member.points.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="spent-info">
                      <div className="spent-value" data-testid={`spent-${member.id}`}>
                        ¥{member.totalSpent.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="order-info">
                      <div className="order-count" data-testid={`order-count-${member.id}`}>
                        {member.orderCount}
                      </div>
                      <div className="last-order">
                        最后: {member.lastOrderDate ? formatDate(member.lastOrderDate) : '无'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={member.status}
                      onChange={(e) => handleUpdateMemberStatus(member.id, e.target.value)}
                      className={`status-select ${getStatusClass(member.status)}`}
                      data-testid={`status-select-${member.id}`}
                    >
                      <option value="active">活跃</option>
                      <option value="inactive">非活跃</option>
                      <option value="suspended">已暂停</option>
                      <option value="banned">已封禁</option>
                    </select>
                  </td>
                  <td>
                    <div className="login-info">
                      <div data-testid={`last-login-${member.id}`}>
                        {member.lastLoginAt ? formatDate(member.lastLoginAt) : '从未登录'}
                      </div>
                      <div className="login-count">
                        登录 {member.loginCount} 次
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleViewMemberDetail(member)}
                        data-testid={`view-detail-btn-${member.id}`}
                        className="btn-small btn-info"
                      >
                        详情
                      </button>
                      <button
                        onClick={() => handleEditMember(member)}
                        data-testid={`edit-btn-${member.id}`}
                        className="btn-small btn-secondary"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        data-testid={`delete-btn-${member.id}`}
                        className="btn-small btn-danger"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div data-testid="empty-state" className="empty-state">
              <p>没有找到符合条件的会员</p>
            </div>
          )}
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="pagination" data-testid="pagination">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              data-testid="prev-page"
            >
              上一页
            </button>
            <span data-testid="page-info">
              第 {currentPage} 页，共 {totalPages} 页，共 {filteredMembers.length} 条记录
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              data-testid="next-page"
            >
              下一页
            </button>
          </div>
        )}

        {/* 会员详情模态框 */}
        {showMemberDetailModal && selectedMember && (
          <MemberDetailModal
            member={selectedMember}
            onClose={() => {
              setShowMemberDetailModal(false)
              setSelectedMember(null)
            }}
            onEdit={() => {
              setShowMemberDetailModal(false)
              setEditingMember(selectedMember)
              setShowEditModal(true)
            }}
            onChangeTier={() => {
              setShowMemberDetailModal(false)
              setTierEditingMember(selectedMember)
              setShowTierModal(true)
            }}
          />
        )}

        {/* 编辑会员模态框 */}
        {showEditModal && editingMember && (
          <EditMemberModal
            member={editingMember}
            onClose={() => {
              setShowEditModal(false)
              setEditingMember(null)
            }}
            onSave={(updatedMember) => {
              handleUpdateMember(updatedMember)
              setShowEditModal(false)
              setEditingMember(null)
            }}
          />
        )}

        {/* 等级管理模态框 */}
        {showTierModal && tierEditingMember && (
          <TierManagementModal
            member={tierEditingMember}
            tiers={TEST_CONFIG.MEMBER_TIERS}
            onClose={() => {
              setShowTierModal(false)
              setTierEditingMember(null)
            }}
            onSave={(newTierId) => {
              handleUpdateTier(tierEditingMember.id, newTierId)
              setShowTierModal(false)
              setTierEditingMember(null)
            }}
          />
        )}

        {/* 添加会员模态框 */}
        {showAddMemberModal && (
          <AddMemberModal
            onClose={() => setShowAddMemberModal(false)}
            onSave={(newMember) => {
              handleAddMember(newMember)
              setShowAddMemberModal(false)
            }}
          />
        )}
      </div>
    )
  }

  return MockMemberManagementPage
}

// 🎭 模拟会员详情模态框
const MemberDetailModal: React.FC<{
  member: any
  onClose: () => void
  onEdit: () => void
  onChangeTier: () => void
}> = ({ member, onClose, onEdit, onChangeTier }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  return (
    <div data-testid="member-detail-modal" className="modal-overlay">
      <div className="modal-content member-detail-modal">
        <div className="modal-header">
          <h2 data-testid="modal-title">会员详情 - {member.memberId}</h2>
          <button onClick={onClose} data-testid="close-modal">×</button>
        </div>

        <div className="modal-body">
          {/* 基本信息 */}
          <div className="member-section">
            <h3>基本信息</h3>
            <div className="member-profile">
              <div className="avatar-section">
                <img src={member.avatar} alt={member.name} data-testid="member-avatar" />
              </div>
              <div className="basic-info">
                <div className="info-grid">
                  <div className="info-item">
                    <label>会员号:</label>
                    <span data-testid="detail-member-id">{member.memberId}</span>
                  </div>
                  <div className="info-item">
                    <label>姓名:</label>
                    <span data-testid="detail-member-name">{member.name}</span>
                  </div>
                  <div className="info-item">
                    <label>邮箱:</label>
                    <span data-testid="detail-member-email">{member.email}</span>
                  </div>
                  <div className="info-item">
                    <label>手机号:</label>
                    <span data-testid="detail-member-phone">{member.phone}</span>
                  </div>
                  <div className="info-item">
                    <label>性别:</label>
                    <span>{member.gender === 'male' ? '男' : member.gender === 'female' ? '女' : '其他'}</span>
                  </div>
                  <div className="info-item">
                    <label>年龄:</label>
                    <span>{calculateAge(member.birthDate)} 岁</span>
                  </div>
                  <div className="info-item">
                    <label>会员等级:</label>
                    <span 
                      className="tier-badge"
                      style={{ backgroundColor: member.tierColor }}
                      data-testid="detail-tier-badge"
                    >
                      {member.tierName}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>状态:</label>
                    <span className={`status-badge ${member.status}`} data-testid="detail-status">
                      {member.status === 'active' ? '活跃' : 
                       member.status === 'inactive' ? '非活跃' : 
                       member.status === 'suspended' ? '已暂停' : '已封禁'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 会员统计 */}
          <div className="member-section">
            <h3>会员统计</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <label>积分:</label>
                <span data-testid="detail-points">{member.points.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <label>总消费额:</label>
                <span data-testid="detail-total-spent">¥{member.totalSpent.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <label>订单数:</label>
                <span data-testid="detail-order-count">{member.orderCount}</span>
              </div>
              <div className="stat-item">
                <label>平均消费:</label>
                <span data-testid="detail-avg-spent">¥{(member.totalSpent / member.orderCount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 收货地址 */}
          <div className="member-section">
            <h3>收货地址</h3>
            <div className="address-info">
              <div data-testid="detail-address">{member.address.street}</div>
              <div>{member.address.city}, {member.address.province} {member.address.zipCode}</div>
              <div>{member.address.country}</div>
            </div>
          </div>

          {/* 社交媒体 */}
          <div className="member-section">
            <h3>社交媒体</h3>
            <div className="social-media-grid">
              {member.socialMedia.wechat && (
                <div className="social-item">
                  <label>微信:</label>
                  <span data-testid="detail-wechat">{member.socialMedia.wechat}</span>
                </div>
              )}
              {member.socialMedia.qq && (
                <div className="social-item">
                  <label>QQ:</label>
                  <span data-testid="detail-qq">{member.socialMedia.qq}</span>
                </div>
              )}
              {member.socialMedia.weibo && (
                <div className="social-item">
                  <label>微博:</label>
                  <span data-testid="detail-weibo">{member.socialMedia.weibo}</span>
                </div>
              )}
            </div>
          </div>

          {/* 会员标签 */}
          <div className="member-section">
            <h3>会员标签</h3>
            <div className="tags-container" data-testid="detail-tags">
              {member.tags.map((tag: string, index: number) => (
                <span key={index} className="member-tag">{tag}</span>
              ))}
            </div>
          </div>

          {/* 注册信息 */}
          <div className="member-section">
            <h3>注册信息</h3>
            <div className="registration-info">
              <div className="info-item">
                <label>注册日期:</label>
                <span data-testid="detail-registration-date">{formatDate(member.registrationDate)}</span>
              </div>
              <div className="info-item">
                <label>注册来源:</label>
                <span data-testid="detail-source">
                  {member.source === 'website' ? '官网注册' : 
                   member.source === 'mobile_app' ? '移动应用' : 
                   member.source === 'offline' ? '线下门店' : 
                   member.source === 'referral' ? '推荐注册' : '社交媒体'}
                </span>
              </div>
              <div className="info-item">
                <label>推荐码:</label>
                <span data-testid="detail-referral-code">{member.referralCode}</span>
              </div>
              {member.referredBy && (
                <div className="info-item">
                  <label>推荐人:</label>
                  <span data-testid="detail-referred-by">{member.referredBy}</span>
                </div>
              )}
              <div className="info-item">
                <label>最后登录:</label>
                <span data-testid="detail-last-login">
                  {member.lastLoginAt ? formatDate(member.lastLoginAt) : '从未登录'}
                </span>
              </div>
              <div className="info-item">
                <label>登录次数:</label>
                <span data-testid="detail-login-count">{member.loginCount} 次</span>
              </div>
            </div>
          </div>

          {/* 备注 */}
          {member.notes && (
            <div className="member-section">
              <h3>备注</h3>
              <div className="member-notes" data-testid="detail-notes">{member.notes}</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onChangeTier} data-testid="change-tier-btn" className="btn-secondary">
            更换等级
          </button>
          <button onClick={onEdit} data-testid="edit-btn" className="btn-primary">
            编辑会员
          </button>
          <button onClick={onClose} data-testid="close-btn">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

// 🎭 模拟编辑会员模态框
const EditMemberModal: React.FC<{
  member: any
  onClose: () => void
  onSave: (updatedMember: any) => void
}> = ({ member, onClose, onSave }) => {
  const [formData, setFormData] = React.useState(member)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }))
  }

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value || null
      }
    }))
  }

  const handlePreferenceChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }))
  }

  const handleTagChange = (tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '姓名不能为空'
    }

    if (!formData.email.trim()) {
      newErrors.email = '邮箱不能为空'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '手机号不能为空'
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '手机号格式不正确'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave(formData)
  }

  return (
    <div data-testid="edit-member-modal" className="modal-overlay">
      <div className="modal-content edit-member-modal">
        <div className="modal-header">
          <h2 data-testid="modal-title">编辑会员 - {member.memberId}</h2>
          <button onClick={onClose} data-testid="close-modal">×</button>
        </div>

        <form onSubmit={handleSubmit} data-testid="edit-member-form">
          <div className="modal-body">
            {/* 基本信息 */}
            <div className="form-section">
              <h3>基本信息</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>姓名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    data-testid="input-name"
                  />
                  {errors.name && <span className="error">{errors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label>邮箱 *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    data-testid="input-email"
                  />
                  {errors.email && <span className="error">{errors.email}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>手机号 *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    data-testid="input-phone"
                  />
                  {errors.phone && <span className="error">{errors.phone}</span>}
                </div>
                
                <div className="form-group">
                  <label>性别</label>
                  <select 
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    data-testid="input-gender"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>生日</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    data-testid="input-birth-date"
                  />
                </div>
              </div>
            </div>

            {/* 收货地址 */}
            <div className="form-section">
              <h3>收货地址</h3>
              <div className="form-group">
                <label>街道地址</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  data-testid="input-address-street"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>城市</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    data-testid="input-address-city"
                  />
                </div>
                
                <div className="form-group">
                  <label>省份</label>
                  <input
                    type="text"
                    value={formData.address.province}
                    onChange={(e) => handleAddressChange('province', e.target.value)}
                    data-testid="input-address-province"
                  />
                </div>
                
                <div className="form-group">
                  <label>邮编</label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    data-testid="input-address-zip"
                  />
                </div>
              </div>
            </div>

            {/* 社交媒体 */}
            <div className="form-section">
              <h3>社交媒体</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>微信号</label>
                  <input
                    type="text"
                    value={formData.socialMedia.wechat || ''}
                    onChange={(e) => handleSocialMediaChange('wechat', e.target.value)}
                    data-testid="input-wechat"
                  />
                </div>
                
                <div className="form-group">
                  <label>QQ号</label>
                  <input
                    type="text"
                    value={formData.socialMedia.qq || ''}
                    onChange={(e) => handleSocialMediaChange('qq', e.target.value)}
                    data-testid="input-qq"
                  />
                </div>
                
                <div className="form-group">
                  <label>微博</label>
                  <input
                    type="text"
                    value={formData.socialMedia.weibo || ''}
                    onChange={(e) => handleSocialMediaChange('weibo', e.target.value)}
                    data-testid="input-weibo"
                  />
                </div>
              </div>
            </div>

            {/* 备注 */}
            <div className="form-section">
              <h3>备注</h3>
              <div className="form-group">
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  data-testid="input-notes"
                  placeholder="会员备注信息"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} data-testid="cancel-btn">
              取消
            </button>
            <button type="submit" data-testid="save-btn" className="btn-primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 🎭 模拟等级管理模态框
const TierManagementModal: React.FC<{
  member: any
  tiers: any[]
  onClose: () => void
  onSave: (newTierId: string) => void
}> = ({ member, tiers, onClose, onSave }) => {
  const [selectedTierId, setSelectedTierId] = React.useState(member.tierId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(selectedTierId)
  }

  return (
    <div data-testid="tier-modal" className="modal-overlay">
      <div className="modal-content tier-modal">
        <div className="modal-header">
          <h2 data-testid="modal-title">更换会员等级 - {member.memberId}</h2>
          <button onClick={onClose} data-testid="close-modal">×</button>
        </div>

        <form onSubmit={handleSubmit} data-testid="tier-form">
          <div className="modal-body">
            <div className="current-tier">
              <h3>当前等级</h3>
              <div className="tier-info">
                <span 
                  className="tier-badge"
                  style={{ backgroundColor: member.tierColor }}
                >
                  {member.tierName}
                </span>
                <div className="tier-requirements">
                  积分: {member.points.toLocaleString()}, 消费额: ¥{member.totalSpent.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="tier-selection">
              <h3>选择新等级</h3>
              <div className="tiers-grid">
                {tiers.map(tier => (
                  <div 
                    key={tier.id}
                    className={`tier-card ${selectedTierId === tier.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTierId(tier.id)}
                    data-testid={`tier-card-${tier.id}`}
                  >
                    <div className="tier-header">
                      <span 
                        className="tier-badge"
                        style={{ backgroundColor: tier.color }}
                      >
                        {tier.name}
                      </span>
                    </div>
                    <div className="tier-requirements">
                      <p>要求: {tier.requirements}</p>
                      <div className="tier-benefits">
                        <h4>权益:</h4>
                        <ul>
                          {tier.benefits.map((benefit: string, index: number) => (
                            <li key={index}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} data-testid="cancel-btn">
              取消
            </button>
            <button type="submit" data-testid="save-btn" className="btn-primary">
              确认更换
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 🎭 模拟添加会员模态框
const AddMemberModal: React.FC<{
  onClose: () => void
  onSave: (newMember: any) => void
}> = ({ onClose, onSave }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    gender: 'male',
    birthDate: '',
    address: {
      street: '',
      city: '',
      province: '',
      zipCode: '',
      country: '中国'
    },
    socialMedia: {
      wechat: '',
      qq: '',
      weibo: ''
    },
    notes: ''
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }))
  }

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '姓名不能为空'
    }

    if (!formData.email.trim()) {
      newErrors.email = '邮箱不能为空'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '手机号不能为空'
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '手机号格式不正确'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave(formData)
  }

  return (
    <div data-testid="add-member-modal" className="modal-overlay">
      <div className="modal-content add-member-modal">
        <div className="modal-header">
          <h2 data-testid="modal-title">添加新会员</h2>
          <button onClick={onClose} data-testid="close-modal">×</button>
        </div>

        <form onSubmit={handleSubmit} data-testid="add-member-form">
          <div className="modal-body">
            {/* 基本信息 */}
            <div className="form-section">
              <h3>基本信息</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>姓名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    data-testid="input-name"
                  />
                  {errors.name && <span className="error">{errors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label>邮箱 *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    data-testid="input-email"
                  />
                  {errors.email && <span className="error">{errors.email}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>手机号 *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    data-testid="input-phone"
                  />
                  {errors.phone && <span className="error">{errors.phone}</span>}
                </div>
                
                <div className="form-group">
                  <label>性别</label>
                  <select 
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    data-testid="input-gender"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>生日</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    data-testid="input-birth-date"
                  />
                </div>
              </div>
            </div>

            {/* 收货地址 */}
            <div className="form-section">
              <h3>收货地址</h3>
              <div className="form-group">
                <label>街道地址</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  data-testid="input-address-street"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>城市</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    data-testid="input-address-city"
                  />
                </div>
                
                <div className="form-group">
                  <label>省份</label>
                  <input
                    type="text"
                    value={formData.address.province}
                    onChange={(e) => handleAddressChange('province', e.target.value)}
                    data-testid="input-address-province"
                  />
                </div>
                
                <div className="form-group">
                  <label>邮编</label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    data-testid="input-address-zip"
                  />
                </div>
              </div>
            </div>

            {/* 社交媒体 */}
            <div className="form-section">
              <h3>社交媒体</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>微信号</label>
                  <input
                    type="text"
                    value={formData.socialMedia.wechat}
                    onChange={(e) => handleSocialMediaChange('wechat', e.target.value)}
                    data-testid="input-wechat"
                  />
                </div>
                
                <div className="form-group">
                  <label>QQ号</label>
                  <input
                    type="text"
                    value={formData.socialMedia.qq}
                    onChange={(e) => handleSocialMediaChange('qq', e.target.value)}
                    data-testid="input-qq"
                  />
                </div>
                
                <div className="form-group">
                  <label>微博</label>
                  <input
                    type="text"
                    value={formData.socialMedia.weibo}
                    onChange={(e) => handleSocialMediaChange('weibo', e.target.value)}
                    data-testid="input-weibo"
                  />
                </div>
              </div>
            </div>

            {/* 备注 */}
            <div className="form-section">
              <h3>备注</h3>
              <div className="form-group">
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  data-testid="input-notes"
                  placeholder="会员备注信息"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} data-testid="cancel-btn">
              取消
            </button>
            <button type="submit" data-testid="save-btn" className="btn-primary">
              添加会员
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

describe('会员管理模块集成测试', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('会员管理页面渲染测试', () => {
    it('应该正确渲染会员管理页面', () => {
      const MockMemberManagementPage = createMockMemberManagementPage()
      render(<MockMemberManagementPage />)

      expect(screen.getByTestId('member-management-page')).toBeInTheDocument()
      expect(screen.getByTestId('page-title')).toHaveTextContent('会员管理')
      expect(screen.getByTestId('stats-section')).toBeInTheDocument()
      expect(screen.getByTestId('filters-section')).toBeInTheDocument()
      expect(screen.getByTestId('members-table-container')).toBeInTheDocument()
    })

    it('应该显示正确的会员统计', () => {
      const MockMemberManagementPage = createMockMemberManagementPage()
      render(<MockMemberManagementPage />)

      expect(screen.getByTestId('total-members')).toHaveTextContent('4')
      expect(screen.getByTestId('active-members')).toHaveTextContent('3')
      expect(screen.getByTestId('inactive-members')).toHaveTextContent('1')
      expect(screen.getByTestId('total-points')).toHaveTextContent('37,500')
      expect(screen.getByTestId('total-spent')).toHaveTextContent('¥126,599.96')
      expect(screen.getByTestId('avg-spent')).toHaveTextContent('¥31,649.99')
    })

    it('应该显示会员列表', () => {
      const MockMemberManagementPage = createMockMemberManagementPage()
      render(<MockMemberManagementPage />)

      expect(screen.getByTestId('member-row-MEMBER-2025-001')).toBeInTheDocument()
      expect(screen.getByTestId('member-row-MEMBER-2025-002')).toBeInTheDocument()
      expect(screen.getByTestId('member-row-MEMBER-2025-003')).toBeInTheDocument()
      expect(screen.getByTestId('member-row-MEMBER-2025-004')).toBeInTheDocument()
    })
  })

  describe('搜索和过滤功能测试', () => {
    it('应该正确处理通用搜索', async () => {
      const MockMemberManagementPage = createMockMemberManagementPage()
      render(<MockMemberManagementPage />)

      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, '张三')
      
      expect(searchInput).toHaveValue('张三')
    })

    it('应该正确处理会员号过滤', async () => {
      const MockMemberManagementPage = createMockMemberManagementPage()
      render(<MockMemberManagementPage />)

      const memberIdFilter = screen.getByTestId('member-id-filter')
      await user.type(memberIdFilter, 'MB-001')
      
      expect(memberIdFilter).toHaveValue('MB-001')
    })

    it('应该正确处理姓名过滤', async () => {
      const MockMemberManagementPage = createMockMemberManagementPage()
      render(<MockMemberManagementPage />)

      const nameFilter = screen.getByTestId('name-filter')
      await user.type(nameFilter, '张三')
      
      expect(nameFilter).toHaveValue('张三')
    })
  })
})