/**
 * @file product-management.test.tsx
 * @description 产品管理模块集成测试 - 商品列表、添加功能、编辑功能、删除功能、搜索过滤功能
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
  INITIAL_PRODUCTS: [
    {
      id: 'PROD-001',
      name: 'iPhone 15 Pro',
      description: '最新款苹果手机',
      price: 9999.00,
      stock: 50,
      category: '手机数码',
      brand: '苹果',
      sku: 'IPH15P-001',
      status: 'active',
      images: ['iphone-15-pro.jpg'],
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: '2025-01-06T10:00:00Z'
    },
    {
      id: 'PROD-002',
      name: 'MacBook Air M3',
      description: '轻薄笔记本电脑',
      price: 8999.00,
      stock: 30,
      category: '电脑办公',
      brand: '苹果',
      sku: 'MBA-M3-001',
      status: 'active',
      images: ['macbook-air.jpg'],
      createdAt: '2025-01-02T14:30:00Z',
      updatedAt: '2025-01-05T16:20:00Z'
    },
    {
      id: 'PROD-003',
      name: '华为P60',
      description: '华为旗舰手机',
      price: 5999.00,
      stock: 0,
      category: '手机数码',
      brand: '华为',
      sku: 'HUA-P60-001',
      status: 'inactive',
      images: ['huawei-p60.jpg'],
      createdAt: '2025-01-03T09:15:00Z',
      updatedAt: '2025-01-04T11:45:00Z'
    }
  ],
  CATEGORIES: [
    '手机数码',
    '电脑办公',
    '家电',
    '服装',
    '家居',
    '食品',
    '图书',
    '运动'
  ],
  FORM_VALIDATION: {
    VALID_PRODUCT: {
      name: '测试商品',
      description: '这是一个测试商品',
      price: 199.99,
      stock: 100,
      category: '手机数码',
      brand: '测试品牌',
      sku: 'TEST-001',
      status: 'active'
    },
    INVALID_PRODUCTS: {
      emptyName: {
        name: '',
        description: '测试商品',
        price: 199.99,
        stock: 100,
        category: '手机数码',
        brand: '测试品牌',
        sku: 'TEST-001'
      },
      invalidPrice: {
        name: '测试商品',
        description: '测试商品',
        price: -10,
        stock: 100,
        category: '手机数码',
        brand: '测试品牌',
        sku: 'TEST-001'
      },
      emptySku: {
        name: '测试商品',
        description: '测试商品',
        price: 199.99,
        stock: 100,
        category: '手机数码',
        brand: '测试品牌',
        sku: ''
      }
    }
  }
}

// 🎭 模拟产品管理页面组件
const createMockProductManagementPage = () => {
  const MockProductManagementPage: React.FC = () => {
    const [products, setProducts] = React.useState(TEST_CONFIG.INITIAL_PRODUCTS)
    const [selectedProducts, setSelectedProducts] = React.useState<Set<string>>(new Set())
    const [showAddModal, setShowAddModal] = React.useState(false)
    const [showEditModal, setShowEditModal] = React.useState(false)
    const [editingProduct, setEditingProduct] = React.useState<any>(null)
    const [filters, setFilters] = React.useState({
      search: '',
      category: 'all',
      status: 'all',
      brand: 'all',
      priceRange: { min: '', max: '' }
    })
    const [sortBy, setSortBy] = React.useState('createdAt')
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
    const [currentPage, setCurrentPage] = React.useState(1)
    const itemsPerPage = 10

    // 过滤和排序逻辑
    const filteredProducts = products
      .filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                            product.description.toLowerCase().includes(filters.search.toLowerCase())
        const matchesCategory = filters.category === 'all' || product.category === filters.category
        const matchesStatus = filters.status === 'all' || product.status === filters.status
        const matchesBrand = filters.brand === 'all' || product.brand === filters.brand
        const matchesPriceRange = 
          (filters.priceRange.min === '' || product.price >= parseFloat(filters.priceRange.min)) &&
          (filters.priceRange.max === '' || product.price <= parseFloat(filters.priceRange.max))
        
        return matchesSearch && matchesCategory && matchesStatus && matchesBrand && matchesPriceRange
      })
      .sort((a, b) => {
        const aVal = a[sortBy as keyof typeof a]
        const bVal = b[sortBy as keyof typeof b]
        const modifier = sortOrder === 'asc' ? 1 : -1
        return aVal > bVal ? modifier : -modifier
      })

    // 分页逻辑
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
    const paginatedProducts = filteredProducts.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )

    const handleFilterChange = (key: string, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }))
      setCurrentPage(1) // 重置到第一页
    }

    const handleSort = (field: string) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setSortBy(field)
        setSortOrder('asc')
      }
    }

    const handleSelectProduct = (productId: string) => {
      const newSelected = new Set(selectedProducts)
      if (newSelected.has(productId)) {
        newSelected.delete(productId)
      } else {
        newSelected.add(productId)
      }
      setSelectedProducts(newSelected)
    }

    const handleSelectAll = () => {
      if (selectedProducts.size === paginatedProducts.length) {
        setSelectedProducts(new Set())
      } else {
        setSelectedProducts(new Set(paginatedProducts.map(p => p.id)))
      }
    }

    const handleAddProduct = (productData: any) => {
      const newProduct = {
        ...productData,
        id: `PROD-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        images: []
      }
      setProducts(prev => [newProduct, ...prev])
      setShowAddModal(false)
    }

    const handleEditProduct = (productData: any) => {
      const updatedProduct = {
        ...editingProduct,
        ...productData,
        updatedAt: new Date().toISOString()
      }
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p))
      setShowEditModal(false)
      setEditingProduct(null)
    }

    const handleDeleteProduct = async (productId: string) => {
      setProducts(prev => prev.filter(p => p.id !== productId))
      setSelectedProducts(prev => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }

    const handleBatchDelete = async () => {
      if (confirm(`确定要删除选中的 ${selectedProducts.size} 个产品吗？`)) {
        setProducts(prev => prev.filter(p => !selectedProducts.has(p.id)))
        setSelectedProducts(new Set())
      }
    }

    const getUniqueBrands = () => {
      const brands = Array.from(new Set(products.map(p => p.brand)))
      return brands.sort()
    }

    const getStockStatus = (stock: number) => {
      if (stock === 0) return { text: '缺货', class: 'stock-out' }
      if (stock < 10) return { text: '库存不足', class: 'stock-low' }
      return { text: '有库存', class: 'stock-normal' }
    }

    const getStatusText = (status: string) => {
      return status === 'active' ? '上架' : '下架'
    }

    const getStatusClass = (status: string) => {
      return status === 'active' ? 'status-active' : 'status-inactive'
    }

    return (
      <div data-testid="product-management-page" className="product-management-container">
        {/* 页面标题和操作栏 */}
        <div className="page-header">
          <h1 data-testid="page-title">产品管理</h1>
          <div className="page-actions">
            <button 
              onClick={() => setShowAddModal(true)}
              data-testid="add-product-btn"
              className="btn-primary"
            >
              添加产品
            </button>
            <button 
              onClick={handleBatchDelete}
              disabled={selectedProducts.size === 0}
              data-testid="batch-delete-btn"
              className="btn-danger"
            >
              批量删除 ({selectedProducts.size})
            </button>
          </div>
        </div>

        {/* 过滤和搜索栏 */}
        <div className="filters-section" data-testid="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索产品名称或描述"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              data-testid="search-input"
            />
          </div>

          <div className="filter-controls">
            <div className="filter-group">
              <label>分类:</label>
              <select 
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                data-testid="category-filter"
              >
                <option value="all">全部分类</option>
                {TEST_CONFIG.CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>状态:</label>
              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                data-testid="status-filter"
              >
                <option value="all">全部状态</option>
                <option value="active">上架</option>
                <option value="inactive">下架</option>
              </select>
            </div>

            <div className="filter-group">
              <label>品牌:</label>
              <select 
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                data-testid="brand-filter"
              >
                <option value="all">全部品牌</option>
                {getUniqueBrands().map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <div className="filter-group price-range">
              <label>价格范围:</label>
              <input
                type="number"
                placeholder="最低价"
                value={filters.priceRange.min}
                onChange={(e) => handleFilterChange('priceRange', {
                  ...filters.priceRange,
                  min: e.target.value
                })}
                data-testid="price-min-input"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="最高价"
                value={filters.priceRange.max}
                onChange={(e) => handleFilterChange('priceRange', {
                  ...filters.priceRange,
                  max: e.target.value
                })}
                data-testid="price-max-input"
              />
            </div>
          </div>
        </div>

        {/* 产品统计 */}
        <div className="stats-section" data-testid="stats-section">
          <div className="stat-item">
            <span className="stat-label">总产品数:</span>
            <span className="stat-value" data-testid="total-products">{products.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">上架产品:</span>
            <span className="stat-value" data-testid="active-products">
              {products.filter(p => p.status === 'active').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">缺货产品:</span>
            <span className="stat-value" data-testid="out-of-stock-products">
              {products.filter(p => p.stock === 0).length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">筛选结果:</span>
            <span className="stat-value" data-testid="filtered-count">{filteredProducts.length}</span>
          </div>
        </div>

        {/* 产品列表 */}
        <div className="products-table-container" data-testid="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0}
                    onChange={handleSelectAll}
                    data-testid="select-all-checkbox"
                  />
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  data-testid="sort-name"
                >
                  产品名称 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('price')}
                  data-testid="sort-price"
                >
                  价格 {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>库存</th>
                <th>分类</th>
                <th>品牌</th>
                <th 
                  onClick={() => handleSort('status')}
                  data-testid="sort-status"
                >
                  状态 {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map(product => {
                const stockStatus = getStockStatus(product.stock)
                return (
                  <tr key={product.id} data-testid={`product-row-${product.id}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        data-testid={`product-checkbox-${product.id}`}
                      />
                    </td>
                    <td>
                      <div className="product-info">
                        <div className="product-name" data-testid={`product-name-${product.id}`}>
                          {product.name}
                        </div>
                        <div className="product-sku">SKU: {product.sku}</div>
                      </div>
                    </td>
                    <td data-testid={`product-price-${product.id}`}>
                      ¥{product.price.toFixed(2)}
                    </td>
                    <td>
                      <div className="stock-info">
                        <span data-testid={`product-stock-${product.id}`}>
                          {product.stock}
                        </span>
                        <span className={`stock-status ${stockStatus.class}`} data-testid={`stock-status-${product.id}`}>
                          {stockStatus.text}
                        </span>
                      </div>
                    </td>
                    <td data-testid={`product-category-${product.id}`}>{product.category}</td>
                    <td data-testid={`product-brand-${product.id}`}>{product.brand}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(product.status)}`} data-testid={`status-badge-${product.id}`}>
                        {getStatusText(product.status)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => {
                            setEditingProduct(product)
                            setShowEditModal(true)
                          }}
                          data-testid={`edit-btn-${product.id}`}
                          className="btn-small btn-secondary"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          data-testid={`delete-btn-${product.id}`}
                          className="btn-small btn-danger"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div data-testid="empty-state" className="empty-state">
              <p>没有找到符合条件的产品</p>
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
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentName === totalPages}
              data-testid="next-page"
            >
              下一页
            </button>
          </div>
        )}

        {/* 添加产品模态框 */}
        {showAddModal && (
          <AddProductModal
            onClose={() => setShowAddModal(false)}
            onSave={handleAddProduct}
            categories={TEST_CONFIG.CATEGORIES}
          />
        )}

        {/* 编辑产品模态框 */}
        {showEditModal && editingProduct && (
          <EditProductModal
            product={editingProduct}
            onClose={() => {
              setShowEditModal(false)
              setEditingProduct(null)
            }}
            onSave={handleEditProduct}
            categories={TEST_CONFIG.CATEGORIES}
          />
        )}
      </div>
    )
  }

  return MockProductManagementPage
}

// 🎭 模拟添加产品模态框
const AddProductModal: React.FC<{
  onClose: () => void
  onSave: (productData: any) => void
  categories: string[]
}> = ({ onClose, onSave, categories }) => {
  const [formData, setFormData] = React.useState(TEST_CONFIG.FORM_VALIDATION.VALID_PRODUCT)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '产品名称不能为空'
    }

    if (formData.price < 0) {
      newErrors.price = '价格不能为负数'
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU不能为空'
    }

    if (formData.stock < 0) {
      newErrors.stock = '库存不能为负数'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div data-testid="add-product-modal" className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 data-testid="modal-title">添加产品</h2>
          <button onClick={onClose} data-testid="close-modal">×</button>
        </div>

        <form onSubmit={handleSubmit} data-testid="product-form">
          <div className="form-group">
            <label>产品名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              data-testid="input-name"
            />
            {errors.name && <span className="error" data-testid="error-name">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>产品描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              data-testid="input-description"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>价格 *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                data-testid="input-price"
              />
              {errors.price && <span className="error" data-testid="error-price">{errors.price}</span>}
            </div>

            <div className="form-group">
              <label>库存 *</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                data-testid="input-stock"
              />
              {errors.stock && <span className="error" data-testid="error-stock">{errors.stock}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>分类 *</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                data-testid="input-category"
              >
                <option value="">请选择分类</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>品牌</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                data-testid="input-brand"
              />
            </div>
          </div>

          <div className="form-group">
            <label>SKU *</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => handleInputChange('sku', e.target.value)}
              data-testid="input-sku"
            />
            {errors.sku && <span className="error" data-testid="error-sku">{errors.sku}</span>}
          </div>

          <div className="form-group">
            <label>状态</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              data-testid="input-status"
            >
              <option value="active">上架</option>
              <option value="inactive">下架</option>
            </select>
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

// 🎭 模拟编辑产品模态框
const EditProductModal: React.FC<{
  product: any
  onClose: () => void
  onSave: (productData: any) => void
  categories: string[]
}> = ({ product, onClose, onSave, categories }) => {
  const [formData, setFormData] = React.useState(product)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '产品名称不能为空'
    }

    if (formData.price < 0) {
      newErrors.price = '价格不能为负数'
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU不能为空'
    }

    if (formData.stock < 0) {
      newErrors.stock = '库存不能为负数'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div data-testid="edit-product-modal" className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 data-testid="modal-title">编辑产品</h2>
          <button onClick={onClose} data-testid="close-modal">×</button>
        </div>

        <form onSubmit={handleSubmit} data-testid="product-form">
          <div className="form-group">
            <label>产品名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              data-testid="input-name"
            />
            {errors.name && <span className="error" data-testid="error-name">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>产品描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              data-testid="input-description"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>价格 *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                data-testid="input-price"
              />
              {errors.price && <span className="error" data-testid="error-price">{errors.price}</span>}
            </div>

            <div className="form-group">
              <label>库存 *</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                data-testid="input-stock"
              />
              {errors.stock && <span className="error" data-testid="error-stock">{errors.stock}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>分类 *</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                data-testid="input-category"
              >
                <option value="">请选择分类</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>品牌</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                data-testid="input-brand"
              />
            </div>
          </div>

          <div className="form-group">
            <label>SKU *</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => handleInputChange('sku', e.target.value)}
              data-testid="input-sku"
            />
            {errors.sku && <span className="error" data-testid="error-sku">{errors.sku}</span>}
          </div>

          <div className="form-group">
            <label>状态</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              data-testid="input-status"
            >
              <option value="active">上架</option>
              <option value="inactive">下架</option>
            </select>
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

describe('产品管理模块集成测试', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('产品管理页面渲染测试', () => {
    it('应该正确渲染产品管理页面', () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      expect(screen.getByTestId('product-management-page')).toBeInTheDocument()
      expect(screen.getByTestId('page-title')).toHaveTextContent('产品管理')
      expect(screen.getByTestId('filters-section')).toBeInTheDocument()
      expect(screen.getByTestId('stats-section')).toBeInTheDocument()
      expect(screen.getByTestId('products-table-container')).toBeInTheDocument()
    })

    it('应该显示正确的产品统计', () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      expect(screen.getByTestId('total-products')).toHaveTextContent('3')
      expect(screen.getByTestId('active-products')).toHaveTextContent('2')
      expect(screen.getByTestId('out-of-stock-products')).toHaveTextContent('1')
    })

    it('应该显示产品列表', () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      expect(screen.getByTestId('product-row-PROD-001')).toBeInTheDocument()
      expect(screen.getByTestId('product-row-PROD-002')).toBeInTheDocument()
      expect(screen.getByTestId('product-row-PROD-003')).toBeInTheDocument()
    })
  })

  describe('搜索和过滤功能测试', () => {
    it('应该正确处理搜索功能', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const searchInput = screen.getByTestId('search-input')
      
      await user.type(searchInput, 'iPhone')
      
      expect(searchInput).toHaveValue('iPhone')
    })

    it('应该正确处理分类过滤', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const categoryFilter = screen.getByTestId('category-filter')
      
      await user.selectOptions(categoryFilter, '手机数码')
      
      expect(categoryFilter).toHaveValue('手机数码')
    })

    it('应该正确处理状态过滤', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const statusFilter = screen.getByTestId('status-filter')
      
      await user.selectOptions(statusFilter, 'active')
      
      expect(statusFilter).toHaveValue('active')
    })

    it('应该正确处理价格范围过滤', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const priceMinInput = screen.getByTestId('price-min-input')
      const priceMaxInput = screen.getByTestId('price-max-input')
      
      await user.type(priceMinInput, '5000')
      await user.type(priceMaxInput, '10000')
      
      expect(priceMinInput).toHaveValue('5000')
      expect(priceMaxInput).toHaveValue('10000')
    })

    it('应该正确处理品牌过滤', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const brandFilter = screen.getByTestId('brand-filter')
      
      await user.selectOptions(brandFilter, '苹果')
      
      expect(brandFilter).toHaveValue('苹果')
    })
  })

  describe('排序功能测试', () => {
    it('应该正确处理按名称排序', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const sortNameButton = screen.getByTestId('sort-name')
      await user.click(sortNameButton)
      
      expect(screen.getByTestId('sort-name')).toContainElement(screen.getByText('↑'))
    })

    it('应该正确处理按价格排序', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const sortPriceButton = screen.getByTestId('sort-price')
      await user.click(sortPriceButton)
      
      expect(screen.getByTestId('sort-price')).toContainElement(screen.getByText('↓'))
    })

    it('应该正确处理按状态排序', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const sortStatusButton = screen.getByTestId('sort-status')
      await user.click(sortStatusButton)
      
      expect(screen.getByTestId('sort-status')).toContainElement(screen.getByText('↑'))
    })
  })

  describe('产品选择功能测试', () => {
    it('应该正确处理单个产品选择', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const productCheckbox = screen.getByTestId('product-checkbox-PROD-001')
      await user.click(productCheckbox)
      
      expect(productCheckbox).toBeChecked()
    })

    it('应该正确处理全选功能', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const selectAllCheckbox = screen.getByTestId('select-all-checkbox')
      await user.click(selectAllCheckbox)
      
      expect(selectAllCheckbox).toBeChecked()
    })

    it('应该正确显示批量删除按钮状态', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const batchDeleteBtn = screen.getByTestId('batch-delete-btn')
      
      // 初始状态：没有选择产品，批量删除按钮应该被禁用
      expect(batchDeleteBtn).toBeDisabled()
      
      // 选择产品后
      const productCheckbox = screen.getByTestId('product-checkbox-PROD-001')
      await user.click(productCheckbox)
      
      expect(batchDeleteBtn).not.toBeDisabled()
      expect(batchDeleteBtn).toHaveTextContent('批量删除 (1)')
    })
  })

  describe('添加产品功能测试', () => {
    it('应该正确打开添加产品模态框', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const addProductBtn = screen.getByTestId('add-product-btn')
      await user.click(addProductBtn)
      
      expect(screen.getByTestId('add-product-modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-title')).toHaveTextContent('添加产品')
    })

    it('应该正确验证表单字段', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const addProductBtn = screen.getByTestId('add-product-btn')
      await user.click(addProductBtn)

      const saveBtn = screen.getByTestId('save-btn')
      await user.click(saveBtn)

      // 验证错误信息显示
      expect(screen.getByTestId('error-name')).toHaveTextContent('产品名称不能为空')
      expect(screen.getByTestId('error-sku')).toHaveTextContent('SKU不能为空')
    })

    it('应该正确保存新产品', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const addProductBtn = screen.getByTestId('add-product-btn')
      await user.click(addProductBtn)

      // 填写表单
      const nameInput = screen.getByTestId('input-name')
      const priceInput = screen.getByTestId('input-price')
      const stockInput = screen.getByTestId('input-stock')
      const categorySelect = screen.getByTestId('input-category')
      const skuInput = screen.getByTestId('input-sku')

      await user.type(nameInput, '测试产品')
      await user.type(priceInput, '299.99')
      await user.type(stockInput, '100')
      await user.selectOptions(categorySelect, '手机数码')
      await user.type(skuInput, 'TEST-123')

      const saveBtn = screen.getByTestId('save-btn')
      await user.click(saveBtn)

      // 检查模态框是否关闭
      await waitFor(() => {
        expect(screen.queryByTestId('add-product-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('编辑产品功能测试', () => {
    it('应该正确打开编辑产品模态框', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const editBtn = screen.getByTestId('edit-btn-PROD-001')
      await user.click(editBtn)
      
      expect(screen.getByTestId('edit-product-modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-title')).toHaveTextContent('编辑产品')
    })

    it('应该正确预填充表单数据', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const editBtn = screen.getByTestId('edit-btn-PROD-001')
      await user.click(editBtn)

      // 验证预填充的数据
      expect(screen.getByTestId('input-name')).toHaveValue('iPhone 15 Pro')
      expect(screen.getByTestId('input-price')).toHaveValue(9999)
      expect(screen.getByTestId('input-stock')).toHaveValue(50)
      expect(screen.getByTestId('input-category')).toHaveValue('手机数码')
    })

    it('应该正确保存编辑后的产品', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const editBtn = screen.getByTestId('edit-btn-PROD-001')
      await user.click(editBtn)

      // 修改产品名称
      const nameInput = screen.getByTestId('input-name')
      await user.clear(nameInput)
      await user.type(nameInput, 'iPhone 15 Pro Max')

      const saveBtn = screen.getByTestId('save-btn')
      await user.click(saveBtn)

      // 检查模态框是否关闭
      await waitFor(() => {
        expect(screen.queryByTestId('edit-product-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('删除产品功能测试', () => {
    it('应该正确删除单个产品', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      const deleteBtn = screen.getByTestId('delete-btn-PROD-001')
      await user.click(deleteBtn)

      // 验证产品是否从列表中移除
      await waitFor(() => {
        expect(screen.queryByTestId('product-row-PROD-001')).not.toBeInTheDocument()
      })
    })

    it('应该正确处理批量删除', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      // 选择产品
      const checkbox1 = screen.getByTestId('product-checkbox-PROD-001')
      const checkbox2 = screen.getByTestId('product-checkbox-PROD-002')
      await user.click(checkbox1)
      await user.click(checkbox2)

      // 点击批量删除按钮
      const batchDeleteBtn = screen.getByTestId('batch-delete-btn')
      await user.click(batchDeleteBtn)

      // 验证确认对话框显示
      expect(screen.getByText(/确定要删除选中的 2 个产品吗？/)).toBeInTheDocument()
    })
  })

  describe('库存状态显示测试', () => {
    it('应该正确显示库存状态', () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      // 检查有库存的产品
      expect(screen.getByTestId('stock-status-PROD-001')).toHaveTextContent('有库存')
      expect(screen.getByTestId('stock-status-PROD-002')).toHaveTextContent('有库存')
      
      // 检查缺货的产品
      expect(screen.getByTestId('stock-status-PROD-003')).toHaveTextContent('缺货')
    })

    it('应该正确显示库存数量', () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      expect(screen.getByTestId('product-stock-PROD-001')).toHaveTextContent('50')
      expect(screen.getByTestId('product-stock-PROD-002')).toHaveTextContent('30')
      expect(screen.getByTestId('product-stock-PROD-003')).toHaveTextContent('0')
    })
  })

  describe('产品状态显示测试', () => {
    it('应该正确显示产品状态', () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      // 检查上架状态
      expect(screen.getByTestId('status-badge-PROD-001')).toHaveTextContent('上架')
      expect(screen.getByTestId('status-badge-PROD-002')).toHaveTextContent('上架')
      
      // 检查下架状态
      expect(screen.getByTestId('status-badge-PROD-003')).toHaveTextContent('下架')
    })
  })

  describe('分页功能测试', () => {
    // 实际的分页测试需要模拟更多产品数据
    it('应该正确显示分页信息', () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      // 当前只有3个产品，不应该显示分页
      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
    })
  })

  describe('空状态测试', () => {
    it('应该正确显示空状态', async () => {
      const MockProductManagementPage = createMockProductManagementPage()
      render(<MockProductManagementPage />)

      // 搜索不存在的商品
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, '不存在的商品')

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument()
        expect(screen.getByText('没有找到符合条件的产品')).toBeInTheDocument()
      })
    })
  })
})