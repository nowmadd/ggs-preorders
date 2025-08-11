"use client";
import { useEffect, useState } from "react";

export default function AddItemPage() {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    price: "",
    dp: "",
    discount: "",
    category: "",
    releaseDate: "",
    image: "",
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/games");
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    fetchCategories();
  }, []);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.id.trim()) newErrors.id = "Item ID is required.";
    if (!formData.name.trim()) newErrors.name = "Product Name is required.";
    if (!formData.price) newErrors.price = "Price is required.";
    if (!formData.category) newErrors.category = "Please select a category.";

    return newErrors;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "file") {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({ ...prev, image: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" })); // Clear error on change
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          dp: Number(formData.dp),
          discount: Number(formData.discount),
        }),
      });

      if (!res.ok) throw new Error("Failed to add item");

      setSuccess("✅ Item added successfully!");
      setFormData({
        id: "",
        name: "",
        description: "",
        price: "",
        dp: "",
        discount: "",
        category: "",
        releaseDate: "",
        image: "",
      });
      setErrors({});
    } catch (err) {
      console.error(err);
      setSuccess("");
      setErrors({ submit: "❌ Error adding item. Please try again." });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Item</h1>

      {success && (
        <p className="p-2 mb-4 text-green-700 bg-green-100 rounded">
          {success}
        </p>
      )}
      {errors.submit && (
        <p className="p-2 mb-4 text-red-700 bg-red-100 rounded">
          {errors.submit}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Item ID */}
        <div>
          <label className="block font-medium">Item ID</label>
          <input
            type="text"
            name="id"
            value={formData.id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          />
          {errors.id && <p className="text-red-600 text-sm">{errors.id}</p>}
        </div>

        {/* Product Name */}
        <div>
          <label className="block font-medium">Product Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          />
          {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block font-medium">Price</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          />
          {errors.price && (
            <p className="text-red-600 text-sm">{errors.price}</p>
          )}
        </div>

        {/* Down Payment */}
        <div>
          <label className="block font-medium">Down Payment</label>
          <input
            type="number"
            name="dp"
            value={formData.dp}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          />
        </div>

        {/* Discount */}
        <div>
          <label className="block font-medium">Discount</label>
          <input
            type="number"
            name="discount"
            value={formData.discount}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block font-medium">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleSelect}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.game_code}>
                {cat.game_title}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-red-600 text-sm">{errors.category}</p>
          )}
        </div>

        {/* Release Date */}
        <div>
          <label className="block font-medium">Release Date</label>
          <input
            type="date"
            name="releaseDate"
            value={formData.releaseDate}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block font-medium">Image</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          />
          {formData.image && (
            <img
              src={formData.image}
              alt="Preview"
              className="w-32 h-32 object-cover mt-2 rounded"
            />
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Item
        </button>
      </form>
    </div>
  );
}
