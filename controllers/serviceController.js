const { fillTranslations } = require("../utils/translate");
const Service = require("../models/Service");
const { cloudinary } = require("../utils/cloudinary");

/**
 * @route   GET /api/admin/services
 * @route   GET /api/customer/services
 * @desc    Get all services
 */
exports.getAllServices = async (req, res) => {
  const isAdmin = !!req.admin;
  const filter = isAdmin ? {} : { isActive: true };

  const services = await Service.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  res.json({ success: true, count: services.length, services });
};

/**
 * @route   GET /api/admin/services/:id
 * @route   GET /api/customer/services/:id
 * @desc    Get single service
 */
exports.getServiceById = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });
  res.json({ success: true, service });
};

/**
 * @route   POST /api/admin/services
 * @desc    Create a new service
 * @access  Private (Admin)
 */
exports.createService = async (req, res) => {
  const {
    name, nameHindi, nameHinglish,
    description, descriptionHindi, descriptionHinglish,
    hasCategories, sortOrder,
  } = req.body;

  // Auto-translate missing name fields
  const translated = await fillTranslations(name, nameHindi, nameHinglish);

  const serviceData = {
    name: translated.name, nameHindi: translated.nameHindi, nameHinglish: translated.nameHinglish,
    description, descriptionHindi, descriptionHinglish,
    hasCategories: hasCategories !== undefined ? hasCategories : true,
    sortOrder: sortOrder || 0,
  };

  if (req.file) {
    serviceData.image = req.file.path;
  }

  const service = await Service.create(serviceData);
  res.status(201).json({ success: true, service });
};

/**
 * @route   PUT /api/admin/services/:id
 * @desc    Update a service
 * @access  Private (Admin)
 */
exports.updateService = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const updates = { ...req.body };
  if (req.file) {
    // Delete old image from cloudinary
    if (service.image) {
      const publicId = service.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`electrofix/${publicId}`);
    }
    updates.image = req.file.path;
  }

  const updated = await Service.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  res.json({ success: true, service: updated });
};

/**
 * @route   DELETE /api/admin/services/:id
 * @desc    Delete a service
 * @access  Private (Admin)
 */
exports.deleteService = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  if (service.image) {
    const publicId = service.image.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`electrofix/${publicId}`);
  }

  await service.deleteOne();
  res.json({ success: true, message: "Service deleted successfully" });
};

// ========================
// CATEGORY CRUD
// ========================

/**
 * @route   POST /api/admin/services/:id/categories
 * @desc    Add category to a service
 */
exports.addCategory = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const { name, nameHindi, nameHinglish } = req.body;
  const translatedCat = await fillTranslations(name, nameHindi, nameHinglish);
  const categoryData = { name: translatedCat.name, nameHindi: translatedCat.nameHindi, nameHinglish: translatedCat.nameHinglish };
  if (req.file) categoryData.image = req.file.path;

  service.categories.push(categoryData);
  await service.save();

  res.status(201).json({ success: true, service });
};

/**
 * @route   PUT /api/admin/services/:id/categories/:catId
 * @desc    Update a category
 */
exports.updateCategory = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const category = service.categories.id(req.params.catId);
  if (!category) return res.status(404).json({ success: false, message: "Category not found" });

  const { name, nameHindi, nameHinglish, isActive } = req.body;
  if (name) category.name = name;
  if (nameHindi) category.nameHindi = nameHindi;
  if (nameHinglish) category.nameHinglish = nameHinglish;
  if (isActive !== undefined) category.isActive = isActive;
  if (req.file) category.image = req.file.path;

  await service.save();
  res.json({ success: true, service });
};

/**
 * @route   DELETE /api/admin/services/:id/categories/:catId
 * @desc    Delete a category
 */
exports.deleteCategory = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  service.categories = service.categories.filter(
    (cat) => cat._id.toString() !== req.params.catId
  );
  await service.save();
  res.json({ success: true, message: "Category deleted", service });
};

// ========================
// PROBLEM CRUD
// ========================

/**
 * @route   POST /api/admin/services/:id/problems
 * @desc    Add problem directly to service (no category)
 */
exports.addProblemToService = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const { name, nameHindi, nameHinglish, price, isPriceFixed } = req.body;
  const tProb1 = await fillTranslations(name, nameHindi, nameHinglish);
  service.problems.push({ name: tProb1.name, nameHindi: tProb1.nameHindi, nameHinglish: tProb1.nameHinglish, price: price || null, isPriceFixed: isPriceFixed || false });
  await service.save();

  res.status(201).json({ success: true, service });
};

/**
 * @route   POST /api/admin/services/:id/categories/:catId/problems
 * @desc    Add problem to a category
 */
exports.addProblemToCategory = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const category = service.categories.id(req.params.catId);
  if (!category) return res.status(404).json({ success: false, message: "Category not found" });

  const { name, nameHindi, nameHinglish, price, isPriceFixed } = req.body;
  const tProb2 = await fillTranslations(name, nameHindi, nameHinglish);
  category.problems.push({ name: tProb2.name, nameHindi: tProb2.nameHindi, nameHinglish: tProb2.nameHinglish, price: price || null, isPriceFixed: isPriceFixed || false });
  await service.save();

  res.status(201).json({ success: true, service });
};

/**
 * @route   PUT /api/admin/services/:id/categories/:catId/problems/:probId
 * @desc    Update problem in a category
 */
exports.updateProblemInCategory = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const category = service.categories.id(req.params.catId);
  if (!category) return res.status(404).json({ success: false, message: "Category not found" });

  const problem = category.problems.id(req.params.probId);
  if (!problem) return res.status(404).json({ success: false, message: "Problem not found" });

  const { name, nameHindi, nameHinglish, price, isPriceFixed, isActive } = req.body;
  if (name) problem.name = name;
  if (nameHindi) problem.nameHindi = nameHindi;
  if (nameHinglish) problem.nameHinglish = nameHinglish;
  if (price !== undefined) problem.price = price;
  if (isPriceFixed !== undefined) problem.isPriceFixed = isPriceFixed;
  if (isActive !== undefined) problem.isActive = isActive;

  await service.save();
  res.json({ success: true, service });
};

/**
 * @route   DELETE /api/admin/services/:id/categories/:catId/problems/:probId
 * @desc    Delete problem from category
 */
exports.deleteProblemFromCategory = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const category = service.categories.id(req.params.catId);
  if (!category) return res.status(404).json({ success: false, message: "Category not found" });

  category.problems = category.problems.filter(
    (p) => p._id.toString() !== req.params.probId
  );
  await service.save();
  res.json({ success: true, message: "Problem deleted", service });
};

/**
 * @route   PUT /api/admin/services/:id/problems/:probId
 * @desc    Update direct problem in service
 */
exports.updateProblemInService = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const problem = service.problems.id(req.params.probId);
  if (!problem) return res.status(404).json({ success: false, message: "Problem not found" });

  const { name, nameHindi, nameHinglish, price, isPriceFixed, isActive } = req.body;
  if (name) problem.name = name;
  if (nameHindi !== undefined) problem.nameHindi = nameHindi;
  if (nameHinglish !== undefined) problem.nameHinglish = nameHinglish;
  if (price !== undefined) problem.price = price;
  if (isPriceFixed !== undefined) problem.isPriceFixed = isPriceFixed;
  if (isActive !== undefined) problem.isActive = isActive;

  await service.save();
  res.json({ success: true, service });
};

/**
 * @route   DELETE /api/admin/services/:id/problems/:probId
 * @desc    Delete direct problem from service
 */
exports.deleteProblemFromService = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  service.problems = service.problems.filter(
    (p) => p._id.toString() !== req.params.probId
  );
  await service.save();
  res.json({ success: true, message: "Problem deleted", service });
};
