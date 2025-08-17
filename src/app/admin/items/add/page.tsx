"use client";
import { useState, useEffect } from "react";
import { useCreateItemMutation } from "../../../../lib/store/api/itemsApi";
import { useListCategoriesQuery } from "../../../../lib/store/api/gamesApi";

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  const [createItem, { isLoading: saving, isError, isSuccess }] =
    useCreateItemMutation();

  const {
    data: categories = [],
    isLoading: catsLoading,
    isError: catsError,
    refetch: refetchCategories,
  } = useListCategoriesQuery();
  console.log("RTK categories data:", categories); // should be categories
  useEffect(() => {
    if (isSuccess) setSuccess("✅ Item added successfully!");
  }, [isSuccess]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
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
        reader.onloadend = () =>
          setFormData((prev) => ({ ...prev, image: reader.result as string }));
        reader.readAsDataURL(file);
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccess("");
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    try {
      await createItem({
        id: formData.id.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        price: Number(formData.price),
        dp: formData.dp ? Number(formData.dp) : 0,
        discount: formData.discount ? Number(formData.discount) : 0,
        category: formData.category || undefined,
        releaseDate: formData.releaseDate || undefined,
        image: formData.image || undefined,
      }).unwrap();

      // reset form after success
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
    } catch (e) {
      // handled by isError
      console.error(e);
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
      {isError && (
        <p className="p-2 mb-4 text-red-700 bg-red-100 rounded">
          Error adding item. Please try again.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label className="block font-medium">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleSelect}
            className="w-full border p-2 rounded"
            disabled={catsLoading}
          >
            <option value="">
              {catsLoading ? "Loading categories..." : "Select Category"}
            </option>
            {categories.map((cat: any) => (
              <option key={cat._id ?? cat.game_code} value={cat.game_title}>
                {cat.game_title}
              </option>
            ))}
          </select>
          {catsError && (
            <p className="text-red-600 text-sm">
              Failed to load categories.{" "}
              <button
                type="button"
                onClick={() => refetchCategories()}
                className="underline"
              >
                Retry
              </button>
            </p>
          )}
          {errors.category && (
            <p className="text-red-600 text-sm">{errors.category}</p>
          )}
        </div>

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

        <div>
          <label className="block font-medium">Image</label>
          {/* <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          /> */}
          {formData.image && (
            // <div className="mt-2 w-32 aspect-square">
            //   <img
            //     src={formData.image}
            //     alt="Preview"
            //     className="w-full h-full object-cover rounded"
            //   />
            // </div>
            <></>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add Item"}
        </button>
      </form>
    </div>
  );
}
