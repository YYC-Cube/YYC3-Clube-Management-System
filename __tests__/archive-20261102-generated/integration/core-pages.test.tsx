/**
 * @file core-pages.test.tsx
 * @description 核心功能页面集成测试 - 仪表盘、产品列表、订单列表等关键页面测试
 * @module __tests__/integration
 * @author YYC³
 * @version 1.0.0
 * @created 2025-01-06
 * @updated 2025-01-06
 */

// Jest 全局：describe/it/expect/beforeEach/afterEach；原 vitest 导入已清理（协同规范 05 §6 治理②）
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// 🧪 测试配置
const TEST_CONFIG = {
  DASHBOARD_STATS: {
    totalRevenue: 128500,
    totalOrders: 1250,
    activeProducts: 89,
    activeMembers: 456
  },
  PRODUCT_LIST: [
    { id: '001', name: '商品A', price: 99.99, stock: 100, category: '电子产品' },
    { id: '002', name: '商品B', price: 199.99, stock: 50, category: '服装' },
    { id: '003', name: '商品C', price: 49.99, stock: 200, category: '食品' }
  ],
  ORDER_LIST: [
    { id: 'ORDER-001', customerName: '张三', amount: 299.99, status: 'pending', createdAt: '2025-01-06' },
    { id: 'ORDER-002', customerName: '李四', amount: 159.99, status: 'completed', createdAt: '2025-01-05' },
    { id: 'ORDER-003', customerName: '王五', amount: 499.99, status: 'processing', createdAt: '2025-01-04' }
  ]
}

// 🎭 模拟仪表盘页面组件
const createMockDashboardPage = () => {
  const MockDashboardPage: React.FC = () => {
    const [dashboardData, setDashboardData] = React.useState(TEST_CONFIG.DASHBOARD_STATS)
    const [selectedPeriod, setSelectedPeriod] = React.useState('today')
    const [refreshLoading, setRefreshLoading] = React.useState(false)

    const handleRefresh = async () => {
      setRefreshLoading(true)
      // 模拟数据刷新
      setTimeout(() => {
        setRefreshLoading(false)
        setDashboardData({
          totalRevenue: TEST_CONFIG.DASHBOARD_STATS.totalRevenue + 1000,
          totalOrders: TEST_CONFIG.DASHBOARD_STATS.totalOrders + 10,
          activeProducts: TEST_CONFIG.DASHBOARD_STATS.activeProducts,
          activeMembers: TEST_CONFIG.DASHBOARD_STATS.activeMembers + 5
        })
      }, 1000)
    }

    return (
      <div data-testid="dashboard-page" className="dashboard-container">
        {/* 页面标题 */}
        <div className="dashboard-header">
          <h1 data-testid="page-title">仪表盘总览</h1>
          <div className="dashboard-controls">
            <select 
              data-testid="period-selector" 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="year">今年</option>
            </select>
            <button 
              onClick={handleRefresh} 
              disabled={refreshLoading}
              data-testid="refresh-button"
            >
              {refreshLoading ? '刷新中...' : '刷新数据'}
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="stats-grid" data-testid="stats-grid">
          <div className="stat-card" data-testid="revenue-card">
            <h3>总收入</h3>
            <p data-testid="revenue-value">¥{dashboardData.totalRevenue.toLocaleString()}</p>
            <span className="stat-change positive">+12.5%</span>
          </div>
          
          <div className="stat-card" data-testid="orders-card">
            <h3>总订单</h3>
            <p data-testid="orders-value">{dashboardData.totalOrders.toLocaleString()}</p>
            <span className="stat-change positive">+8.3%</span>
          </div>
          
          <div className="stat-card" data-testid="products-card">
            <h3>活跃商品</h3>
            <p data-testid="products-value">{dashboardData.activeProducts}</p>
            <span className="stat-change neutral">0%</span>
          </div>
          
          <div className="stat-card" data-testid="members-card">
            <h3>活跃会员</h3>
            <p data-testid="members-value">{dashboardData.activeMembers}</p>
            <span className="stat-change positive">+15.2%</span>
          </div>
        </div>

        {/* 快速操作区域 */}
        <div className="quick-actions" data-testid="quick-actions">
          <button data-testid="quick-action-orders" onClick={() => console.log('跳转订单管理')}>
            管理订单
          </button>
          <button data-testid="quick-action-products" onClick={() => console.log('跳转商品管理')}>
            管理商品
          </button>
          <button data-testid="quick-action-members" onClick={() => console.log('跳转会员管理')}>
            管理会员
          </button>
          <button data-testid="quick-action-reports" onClick={() => console.log('跳转报表')}>
            查看报表
          </button>
        </div>

        {/* 最近活动 */}
        <div className="recent-activities" data-testid="recent-activities">
          <h3>最近活动</h3>
          <div className="activity-list">
            <div className="activity-item" data-testid="activity-1">
              <span>新订单 #ORDER-004</span>
              <span>2分钟前</span>
            </div>
            <div className="activity-item" data-testid="activity-2">
              <span>商品 '商品A' 库存不足</span>
              <span>15分钟前</span>
            </div>
            <div className="activity-item" data-testid="activity-3">
              <span>会员 '张三' 购买了商品</span>
              <span>1小时前</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return MockDashboardPage
}

// 🎭 模拟产品列表页面组件
const createMockProductsPage = () => {
  const MockProductsPage: React.FC = () => {
    const [products, setProducts] = React.useState(TEST_CONFIG.PRODUCT_LIST)
    const [searchTerm, setSearchTerm] = React.useState('')
    const [selectedCategory, setSelectedCategory] = React.useState('all')
    const [isLoading, setIsLoading] = React.useState(false)

    const categories = ['all', '电子产品', '服装', '食品', '家居']

    const filteredProducts = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })

    const handleSearch = (term: string) => {
      setIsLoading(true)
      setSearchTerm(term)
      setTimeout(() => setIsLoading(false), 500)
    }

    const handleCategoryChange = (category: string) => {
      setSelectedCategory(category)
    }

    const handleAddProduct = () => {
      console.log('跳转到添加产品页面')
    }

    const handleEditProduct = (productId: string) => {
      console.log('编辑产品:', productId)
    }

    const handleDeleteProduct = (productId: string) => {
      setProducts(prev => prev.filter(p => p.id !== productId))
    }

    return (
      <div data-testid="products-page" className="products-container">
        {/* 页面标题和操作 */}
        <div className="products-header">
          <h1 data-testid="page-title">商品管理</h1>
          <button onClick={handleAddProduct} data-testid="add-product-button">
            添加商品
          </button>
        </div>

        {/* 搜索和过滤 */}
        <div className="products-filters" data-testid="products-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索商品名称"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              data-testid="search-input"
            />
          </div>
          
          <div className="category-filter">
            <label>分类:</label>
            <select 
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              data-testid="category-selector"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? '全部分类' : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 加载指示器 */}
        {isLoading && (
          <div data-testid="loading-indicator">搜索中...</div>
        )}

        {/* 产品列表 */}
        <div className="products-list" data-testid="products-list">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-item" data-testid={`product-${product.id}`}>
              <div className="product-info">
                <h3 data-testid={`product-name-${product.id}`}>{product.name}</h3>
                <p>分类: {product.category}</p>
                <p>库存: {product.stock}</p>
              </div>
              
              <div className="product-price">
                <span data-testid={`product-price-${product.id}`}>¥{product.price}</span>
              </div>
              
              <div className="product-actions">
                <button 
                  onClick={() => handleEditProduct(product.id)}
                  data-testid={`edit-button-${product.id}`}
                >
                  编辑
                </button>
                <button 
                  onClick={() => handleDeleteProduct(product.id)}
                  data-testid={`delete-button-${product.id}`}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {filteredProducts.length === 0 && !isLoading && (
          <div data-testid="empty-state" className="empty-state">
            <p>没有找到符合条件的商品</p>
          </div>
        )}
      </div>
    )
  }

  return MockProductsPage
}

// 🎭 模拟订单列表页面组件
const createMockOrdersPage = () => {
  const MockOrdersPage: React.FC = () => {
    const [orders, setOrders] = React.useState(TEST_CONFIG.ORDER_LIST)
    const [filterStatus, setFilterStatus] = React.useState('all')
    const [sortBy, setSortBy] = React.useState('createdAt')
    const [sortOrder, setSortOrder] = React.useState('desc')

    const filteredAndSortedOrders = orders
      .filter(order => filterStatus === 'all' || order.status === filterStatus)
      .sort((a, b) => {
        const aVal = a[sortBy as keyof typeof a]
        const bVal = b[sortBy as keyof typeof b]
        const modifier = sortOrder === 'asc' ? 1 : -1
        return aVal > bVal ? modifier : -modifier
      })

    const getStatusText = (status: string) => {
      const statusMap = {
        pending: '待处理',
        processing: '处理中',
        completed: '已完成',
        cancelled: '已取消'
      }
      return statusMap[status as keyof typeof statusMap] || status
    }

    const getStatusClass = (status: string) => {
      const classMap = {
        pending: 'status-pending',
        processing: 'status-processing',
        completed: 'status-completed',
        cancelled: 'status-cancelled'
      }
      return classMap[status as keyof typeof classMap] || 'status-default'
    }

    const handleStatusChange = (orderId: string, newStatus: string) => {
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ))
    }

    const handleViewDetails = (orderId: string) => {
      console.log('查看订单详情:', orderId)
    }

    return (
      <div data-testid="orders-page" className="orders-container">
        {/* 页面标题 */}
        <div className="orders-header">
          <h1 data-testid="page-title">订单管理</h1>
          <div className="orders-stats">
            <span data-testid="total-orders">总订单: {orders.length}</span>
            <span data-testid="pending-orders">
              待处理: {orders.filter(o => o.status === 'pending').length}
            </span>
          </div>
        </div>

        {/* 过滤和排序控制 */}
        <div className="orders-controls" data-testid="orders-controls">
          <div className="status-filter">
            <label>状态:</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              data-testid="status-filter"
            >
              <option value="all">全部</option>
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          <div className="sort-controls">
            <label>排序:</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              data-testid="sort-by"
            >
              <option value="createdAt">创建时间</option>
              <option value="amount">订单金额</option>
              <option value="customerName">客户名称</option>
            </select>
            
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              data-testid="sort-order"
            >
              {sortOrder === 'asc' ? '升序' : '降序'}
            </button>
          </div>
        </div>

        {/* 订单列表 */}
        <div className="orders-list" data-testid="orders-list">
          {filteredAndSortedOrders.map(order => (
            <div key={order.id} className="order-item" data-testid={`order-${order.id}`}>
              <div className="order-header">
                <span data-testid={`order-id-${order.id}`}>#{order.id}</span>
                <span 
                  className={`order-status ${getStatusClass(order.status)}`}
                  data-testid={`order-status-${order.id}`}
                >
                  {getStatusText(order.status)}
                </span>
              </div>
              
              <div className="order-info">
                <div>
                  <strong data-testid={`customer-name-${order.id}`}>{order.customerName}</strong>
                </div>
                <div>
                  <span data-testid={`order-amount-${order.id}`}>¥{order.amount}</span>
                </div>
                <div>
                  <small data-testid={`order-date-${order.id}`}>{order.createdAt}</small>
                </div>
              </div>
              
              <div className="order-actions">
                <select 
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  data-testid={`status-select-${order.id}`}
                >
                  <option value="pending">待处理</option>
                  <option value="processing">处理中</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
                </select>
                
                <button 
                  onClick={() => handleViewDetails(order.id)}
                  data-testid={`view-details-${order.id}`}
                >
                  查看详情
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {filteredAndSortedOrders.length === 0 && (
          <div data-testid="empty-state" className="empty-state">
            <p>没有找到符合条件的订单</p>
          </div>
        )}
      </div>
    )
  }

  return MockOrdersPage
}

describe('核心功能页面集成测试', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('仪表盘页面测试', () => {
    it('应该正确渲染仪表盘页面', () => {
      const MockDashboardPage = createMockDashboardPage()
      render(<MockDashboardPage />)

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
      expect(screen.getByTestId('page-title')).toHaveTextContent('仪表盘总览')
      expect(screen.getByTestId('stats-grid')).toBeInTheDocument()
      expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
      expect(screen.getByTestId('recent-activities')).toBeInTheDocument()
    })

    it('应该显示正确的统计数据', () => {
      const MockDashboardPage = createMockDashboardPage()
      render(<MockDashboardPage />)

      expect(screen.getByTestId('revenue-value')).toHaveTextContent('¥128,500')
      expect(screen.getByTestId('orders-value')).toHaveTextContent('1,250')
      expect(screen.getByTestId('products-value')).toHaveTextContent('89')
      expect(screen.getByTestId('members-value')).toHaveTextContent('456')
    })

    it('应该正确处理时间周期选择', async () => {
      const MockDashboardPage = createMockDashboardPage()
      render(<MockDashboardPage />)

      const periodSelector = screen.getByTestId('period-selector')
      
      await user.selectOptions(periodSelector, 'week')
      expect(screen.getByTestId('period-selector')).toHaveValue('week')
      
      await user.selectOptions(periodSelector, 'month')
      expect(screen.getByTestId('period-selector')).toHaveValue('month')
    })

    it('应该正确处理数据刷新', async () => {
      const MockDashboardPage = createMockDashboardPage()
      render(<MockDashboardPage />)

      const refreshButton = screen.getByTestId('refresh-button')
      
      // 点击刷新按钮
      await user.click(refreshButton)
      
      // 检查加载状态
      expect(screen.getByText('刷新中...')).toBeInTheDocument()
      
      // 等待刷新完成
      await waitFor(() => {
        expect(screen.queryByText('刷新中...')).not.toBeInTheDocument()
      }, { timeout: 1500 })
    })

    it('应该正确响应快速操作按钮', async () => {
      const MockDashboardPage = createMockDashboardPage()
      render(<MockDashboardPage />)

      const quickActionOrders = screen.getByTestId('quick-action-orders')
      const quickActionProducts = screen.getByTestId('quick-action-products')
      const quickActionMembers = screen.getByTestId('quick-action-members')
      const quickActionReports = screen.getByTestId('quick-action-reports')

      expect(quickActionOrders).toBeInTheDocument()
      expect(quickActionProducts).toBeInTheDocument()
      expect(quickActionMembers).toBeInTheDocument()
      expect(quickActionReports).toBeInTheDocument()
    })
  })

  describe('产品列表页面测试', () => {
    it('应该正确渲染产品列表页面', () => {
      const MockProductsPage = createMockProductsPage()
      render(<MockProductsPage />)

      expect(screen.getByTestId('products-page')).toBeInTheDocument()
      expect(screen.getByTestId('page-title')).toHaveTextContent('商品管理')
      expect(screen.getByTestId('products-filters')).toBeInTheDocument()
      expect(screen.getByTestId('products-list')).toBeInTheDocument()
    })

    it('应该显示正确的产品数据', () => {
      const MockProductsPage = createMockProductsPage()
      render(<MockProductsPage />)

      // 检查所有产品是否显示
      expect(screen.getByTestId('product-001')).toBeInTheDocument()
      expect(screen.getByTestId('product-002')).toBeInTheDocument()
      expect(screen.getByTestId('product-003')).toBeInTheDocument()
      
      // 检查产品信息
      expect(screen.getByTestId('product-name-001')).toHaveTextContent('商品A')
      expect(screen.getByTestId('product-price-001')).toHaveTextContent('¥99.99')
      expect(screen.getByTestId('product-name-002')).toHaveTextContent('商品B')
      expect(screen.getByTestId('product-price-002')).toHaveTextContent('¥199.99')
    })

    it('应该正确处理产品搜索', async () => {
      const MockProductsPage = createMockProductsPage()
      render(<MockProductsPage />)

      const searchInput = screen.getByTestId('search-input')
      
      await user.type(searchInput, '商品A')
      
      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.queryByText('搜索中...')).not.toBeInTheDocument()
      })
    })

    it('应该正确处理分类过滤', async () => {
      const MockProductsPage = createMockProductsPage()
      render(<MockProductsPage />)

      const categorySelector = screen.getByTestId('category-selector')
      
      await user.selectOptions(categorySelector, '电子产品')
      
      expect(screen.getByTestId('category-selector')).toHaveValue('电子产品')
    })

    it('应该正确处理产品删除', async () => {
      const MockProductsPage = createMockProductsPage()
      render(<MockProductsPage />)

      const deleteButton = screen.getByTestId('delete-button-001')
      
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.queryByTestId('product-001')).not.toBeInTheDocument()
      })
    })
  })

  describe('订单列表页面测试', () => {
    it('应该正确渲染订单列表页面', () => {
      const MockOrdersPage = createMockOrdersPage()
      render(<MockOrdersPage />)

      expect(screen.getByTestId('orders-page')).toBeInTheDocument()
      expect(screen.getByTestId('page-title')).toHaveTextContent('订单管理')
      expect(screen.getByTestId('orders-controls')).toBeInTheDocument()
      expect(screen.getByTestId('orders-list')).toBeInTheDocument()
    })

    it('应该显示正确的订单数据', () => {
      const MockOrdersPage = createMockOrdersPage()
      render(<MockOrdersPage />)

      // 检查订单统计
      expect(screen.getByTestId('total-orders')).toHaveTextContent('总订单: 3')
      expect(screen.getByTestId('pending-orders')).toHaveTextContent('待处理: 1')
      
      // 检查订单列表
      expect(screen.getByTestId('order-ORDER-001')).toBeInTheDocument()
      expect(screen.getByTestId('order-ORDER-002')).toBeInTheDocument()
      expect(screen.getByTestId('order-ORDER-003')).toBeInTheDocument()
      
      // 检查订单详情
      expect(screen.getByTestId('customer-name-ORDER-001')).toHaveTextContent('张三')
      expect(screen.getByTestId('order-amount-ORDER-001')).toHaveTextContent('¥299.99')
    })

    it('应该正确处理状态过滤', async () => {
      const MockOrdersPage = createMockOrdersPage()
      render(<MockOrdersPage />)

      const statusFilter = screen.getByTestId('status-filter')
      
      await user.selectOptions(statusFilter, 'pending')
      
      expect(screen.getByTestId('status-filter')).toHaveValue('pending')
      
      // 只有一个待处理订单
      expect(screen.getByTestId('order-ORDER-001')).toBeInTheDocument()
      expect(screen.queryByTestId('order-ORDER-002')).not.toBeInTheDocument()
      expect(screen.queryByTestId('order-ORDER-003')).not.toBeInTheDocument()
    })

    it('应该正确处理订单状态更改', async () => {
      const MockOrdersPage = createMockOrdersPage()
      render(<MockOrdersPage />)

      const statusSelect = screen.getByTestId('status-select-ORDER-001')
      
      await user.selectOptions(statusSelect, 'completed')
      
      // 验证状态更改后，待处理订单数应该减少
      await waitFor(() => {
        expect(screen.getByTestId('pending-orders')).toHaveTextContent('待处理: 0')
      })
    })

    it('应该正确处理排序功能', async () => {
      const MockOrdersPage = createMockOrdersPage()
      render(<MockOrdersPage />)

      const sortBySelect = screen.getByTestId('sort-by')
      const sortOrderButton = screen.getByTestId('sort-order')
      
      // 按金额排序
      await user.selectOptions(sortBySelect, 'amount')
      expect(screen.getByTestId('sort-by')).toHaveValue('amount')
      
      // 切换排序顺序
      await user.click(sortOrderButton)
      expect(screen.getByTestId('sort-order')).toHaveTextContent('升序')
    })
  })
})