import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  StatusBar,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const App = () => {
  // State variables
  const [categories, setCategories] = useState([]);
  const [totalAmount, setTotalAmount] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPercentage, setNewCategoryPercentage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [force, setForce] = useState(false);

  // New state variables for the new features
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawCategory, setWithdrawCategory] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [addFundsModalVisible, setAddFundsModalVisible] = useState(false);
  const [addAmount, setAddAmount] = useState("");

  // Store actual amounts available in each category (for withdrawals)
  const [categoryAmounts, setCategoryAmounts] = useState({});

  // Load data from storage on app start
  useEffect(() => {
    loadData();
  }, []);

  // Calculate total percentage whenever categories change
  useEffect(() => {
    const total = categories.reduce(
      (sum, cat) => sum + parseFloat(cat.percentage),
      0
    );
    setTotalPercentage(total);
  }, [categories]);

  // Update distribution whenever total amount or categories change
  // Removed automatic update to prevent double calculations
  // Will now rely on explicit calculate calls

  // Save data to AsyncStorage
  const saveData = async (data) => {
    try {
      await AsyncStorage.setItem("budgetData", JSON.stringify(data));
    } catch (error) {
      Alert.alert("Error", "Failed to save data");
    }
  };

  // Load data from AsyncStorage
  const loadData = async () => {
    try {
      const storedData = await AsyncStorage.getItem("budgetData");
      if (storedData !== null) {
        const parsedData = JSON.parse(storedData);
        setCategories(parsedData.categories || []);
        setTotalAmount(parsedData.totalAmount || "");
        setDistribution(parsedData.distribution || []);
        setCategoryAmounts(parsedData.categoryAmounts || {});
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load data");
    }
  };

  // Update distribution calculations - This will be called explicitly
  const updateDistribution = (
    amount = null,
    isAddFund = false,
    addedFund = null
  ) => {
    // Use provided amount or fallback to totalAmount state
    const budgetAmount = amount !== null ? amount : parseFloat(totalAmount);

    if (!budgetAmount || isNaN(budgetAmount) || budgetAmount <= 0) {
      return; // Exit early if no valid amount
    }

    const newDistribution = [];
    const newCategoryAmounts = { ...categoryAmounts };

    categories.forEach((cat) => {
      const categoryName = cat.name;
      const percentage = parseFloat(cat.percentage);
      let categoryAmount;

      if (isAddFund && addedFund !== null) {
        // When adding funds, calculate the amount to add to this category
        const amountToAdd = (addedFund * percentage) / 100;
        // Get current amount (or calculate if not set)
        const currentAmount = parseFloat(
          newCategoryAmounts[categoryName] ||
            ((parseFloat(totalAmount) * percentage) / 100).toFixed(2)
        );
        // New amount is current amount plus the added portion
        categoryAmount = (currentAmount + amountToAdd).toFixed(2);
      } else {
        // Regular distribution - calculate based on total budget amount
        categoryAmount = ((budgetAmount * percentage) / 100).toFixed(2);
      }

      // Update the category amount
      newCategoryAmounts[categoryName] = categoryAmount;

      newDistribution.push({
        name: categoryName,
        percentage: percentage,
        amount: categoryAmount,
      });
    });

    // Update the total amount if we're adding funds
    const newTotalAmount = isAddFund
      ? (parseFloat(totalAmount) + parseFloat(addedFund)).toFixed(2)
      : budgetAmount.toString();

    setDistribution(newDistribution);
    setCategoryAmounts(newCategoryAmounts);
    setTotalAmount(newTotalAmount);

    // Save all data
    saveData({
      categories,
      totalAmount: newTotalAmount,
      distribution: newDistribution,
      categoryAmounts: newCategoryAmounts,
    });

    return newDistribution;
  };

  // Handle adding/editing a category
  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    const percentage = parseFloat(newCategoryPercentage);
    if (isNaN(percentage) || percentage <= 0) {
      Alert.alert("Error", "Please enter a valid percentage");
      return;
    }

    // Check if adding/editing would exceed 100%
    let updatedTotalPercentage = totalPercentage;
    if (isEditing) {
      updatedTotalPercentage -= parseFloat(categories[editIndex].percentage);
    }

    if (updatedTotalPercentage + percentage > 100) {
      Alert.alert("Error", "Total percentage cannot exceed 100%");
      return;
    }

    let updatedCategories = [...categories];
    const categoryData = {
      name: newCategoryName,
      percentage: percentage,
    };

    if (isEditing && editIndex !== null) {
      updatedCategories[editIndex] = categoryData;
    } else {
      updatedCategories.push(categoryData);
    }

    setCategories(updatedCategories);

    // Reset form
    setNewCategoryName("");
    setNewCategoryPercentage("");
    setModalVisible(false);
    setIsEditing(false);
    setEditIndex(null);

    // If total percentage is 100% and we have a valid amount, update distribution automatically
    const newTotalPercentage = updatedCategories.reduce(
      (sum, cat) => sum + parseFloat(cat.percentage),
      0
    );

    if (
      newTotalPercentage === 100 &&
      totalAmount &&
      parseFloat(totalAmount) > 0
    ) {
      // Use setTimeout to ensure categories state is updated before calculating
      setTimeout(() => {
        calculateDistribution();
      }, 100);
    }
  };

  // Handle editing a category
  const handleEditCategory = (index) => {
    setIsEditing(true);
    setEditIndex(index);
    setNewCategoryName(categories[index].name);
    setNewCategoryPercentage(categories[index].percentage.toString());
    setModalVisible(true);
  };

  // Handle deleting a category
  const handleDeleteCategory = (index) => {
    if (
      !totalAmount ||
      parseFloat(totalAmount) <= 0 ||
      !categories.length ||
      totalPercentage !== 100
    ) {
      setForce(false);
    }
    const updatedCategories = categories.filter((_, i) => i !== index);
    setCategories(updatedCategories);

    // Remove the deleted category from amounts
    const deletedCategoryName = categories[index].name;
    const newCategoryAmounts = { ...categoryAmounts };
    delete newCategoryAmounts[deletedCategoryName];

    // Save updated categories and recalculate distribution if needed
    if (totalAmount && parseFloat(totalAmount) > 0) {
      const newDistribution = updatedCategories.map((cat) => {
        const amount =
          newCategoryAmounts[cat.name] ||
          (
            (parseFloat(totalAmount) * parseFloat(cat.percentage)) /
            100
          ).toFixed(2);
        return {
          name: cat.name,
          percentage: cat.percentage,
          amount: amount,
        };
      });

      setDistribution(newDistribution);
      setCategoryAmounts(newCategoryAmounts);

      saveData({
        categories: updatedCategories,
        totalAmount,
        distribution: newDistribution,
        categoryAmounts: newCategoryAmounts,
      });
    } else {
      saveData({
        categories: updatedCategories,
        totalAmount,
        distribution: [],
        categoryAmounts: newCategoryAmounts,
      });
    }

    // If total percentage is 100% after delete, recalculate
    const newTotalPercentage = updatedCategories.reduce(
      (sum, cat) => sum + parseFloat(cat.percentage),
      0
    );

    if (
      newTotalPercentage === 100 &&
      totalAmount &&
      parseFloat(totalAmount) > 0
    ) {
      setTimeout(() => {
        calculateDistribution();
      }, 100);
    }
  };

  // Calculate distribution based on total amount and percentages
  const calculateDistribution = () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (categories.length === 0) {
      Alert.alert("Error", "Please add at least one category");
      return;
    }

    if (totalPercentage !== 100) {
      Alert.alert("Error", "Total percentage must equal 100%");
      return;
    }

    // Call update distribution with the current total amount
    updateDistribution(parseFloat(totalAmount));
  };

  // Get amount for a category
  const getCategoryAmount = (categoryName, categoryPercentage) => {
    if (!totalAmount || parseFloat(totalAmount) <= 0 || !categoryPercentage) {
      return "0.00";
    }

    // If we have a stored amount for this category, use it
    if (categoryAmounts[categoryName] !== undefined) {
      return categoryAmounts[categoryName];
    }

    // Otherwise calculate it based on percentage
    return (
      (parseFloat(totalAmount) * parseFloat(categoryPercentage)) /
      100
    ).toFixed(2);
  };

  // Handle withdrawal from a category
  const handleWithdraw = (index) => {
    setWithdrawCategory(index);
    setWithdrawAmount("");
    setWithdrawModalVisible(true);
  };

  // Process the withdrawal - Only affects the withdrawn category
  const processWithdrawal = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const withdrawValue = parseFloat(withdrawAmount);
    const category = categories[withdrawCategory];
    const categoryName = category.name;

    // Get current amount in category
    const currentCategoryAmount = parseFloat(
      categoryAmounts[categoryName] ||
        (
          (parseFloat(totalAmount) * parseFloat(category.percentage)) /
          100
        ).toFixed(2)
    );

    // Check if withdrawal amount exceeds category amount
    if (withdrawValue > currentCategoryAmount) {
      Alert.alert(
        "Error",
        `Cannot withdraw more than $${currentCategoryAmount.toFixed(
          2
        )} from ${categoryName}`
      );
      return;
    }

    // Calculate new category amount after withdrawal
    const newCategoryAmount = (currentCategoryAmount - withdrawValue).toFixed(
      2
    );

    // Update just this category's amount
    const newCategoryAmounts = { ...categoryAmounts };
    newCategoryAmounts[categoryName] = newCategoryAmount;

    // Update total amount
    const newTotal = (parseFloat(totalAmount) - withdrawValue).toFixed(2);

    // Update distribution to reflect the change in just this category
    const newDistribution = distribution.map((item) => {
      if (item.name === categoryName) {
        return {
          ...item,
          amount: newCategoryAmount,
        };
      }
      return item;
    });

    // Update all states
    setCategoryAmounts(newCategoryAmounts);
    setDistribution(newDistribution);
    setTotalAmount(newTotal);

    // Save data
    saveData({
      categories,
      totalAmount: newTotal,
      distribution: newDistribution,
      categoryAmounts: newCategoryAmounts,
    });

    // Close modal and reset
    setWithdrawModalVisible(false);
    setWithdrawCategory(null);
    setWithdrawAmount("");

    Alert.alert(
      "Withdrawal Complete",
      `$${withdrawValue.toFixed(
        2
      )} withdrawn from ${categoryName}. New amount: $${newCategoryAmount}`
    );
  };

  // Handle adding funds to the budget
  const handleAddFunds = () => {
    setAddAmount("");
    setAddFundsModalVisible(true);
  };

  // Process adding funds - Fixed to calculate distribution immediately
  const processAddFunds = () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const addValue = parseFloat(addAmount);
    const currentTotal = parseFloat(totalAmount) || 0;
    const newTotal = (currentTotal + addValue).toFixed(2);

    // Close modal and reset
    setAddFundsModalVisible(false);
    setAddAmount("");

    // Update total amount
    setTotalAmount(newTotal);

    // Important: Check if we can immediately calculate distribution
    if (categories.length > 0 && totalPercentage === 100) {
      // Use setTimeout to ensure totalAmount state is updated
      setTimeout(() => {
        updateDistribution(parseFloat(currentTotal), true, addValue);
      }, 100);

      Alert.alert(
        "Funds Added",
        `$${addValue.toFixed(
          2
        )} added to your budget. New total budget: $${newTotal}`
      );
    } else {
      // Just update the total amount without distribution
      saveData({
        categories,
        totalAmount: newTotal,
        distribution,
        categoryAmounts,
      });

      Alert.alert(
        "Funds Added",
        `$${addValue.toFixed(
          2
        )} added to your budget. New total budget: $${newTotal}. Press Calculate to distribute funds when ready.`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budget Distributor</Text>
        <Text style={styles.headerSubtitle}>
          Set categories and distribute your budget
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Total Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Budget</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              placeholder="Enter total amount"
              value={totalAmount}
              onChangeText={setTotalAmount}
            />
          </View>

          {/* Budget Action Buttons */}
          <View style={styles.budgetActions}>
            <TouchableOpacity
              onPress={handleAddFunds}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Add Funds</Text>
            </TouchableOpacity>

            {/* Calculate Distribution Button */}
            <TouchableOpacity
              onPress={() => {
                setForce(true);
                calculateDistribution();
              }}
              style={[
                styles.actionButton,
                !totalAmount ||
                parseFloat(totalAmount) <= 0 ||
                !categories.length ||
                totalPercentage !== 100
                  ? styles.disabledButton
                  : {},
              ]}
              disabled={
                !totalAmount ||
                parseFloat(totalAmount) <= 0 ||
                !categories.length ||
                totalPercentage !== 100
              }
            >
              <Text style={styles.actionButtonText}>Calculate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity
              onPress={() => {
                setIsEditing(false);
                setNewCategoryName("");
                setNewCategoryPercentage("");
                setModalVisible(true);
              }}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No categories added yet</Text>
            </View>
          ) : (
            categories.map((category, index) => (
              <View key={index} style={styles.distributionItem}>
                <View style={styles.distributionHeader}>
                  <Text style={styles.distributionName}>{category.name}</Text>
                  <Text style={styles.distributionPercentage}>
                    {category.percentage}%
                  </Text>
                </View>
                <View className="flex flex-row w-full justify-between">
                  <Text style={styles.distributionAmount}>
                    $
                    {force &&
                      getCategoryAmount(category.name, category.percentage)}
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => handleWithdraw(index)}
                      style={styles.withdrawButton}
                    >
                      <Text>💸</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleEditCategory(index)}
                      style={styles.editButton}
                    >
                      <Text>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(index)}
                      style={styles.deleteButton}
                    >
                      <Text>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              // <View key={index} style={styles.categoryItem}>
              //   <View style={styles.categoryInfoContainer}>
              //     <Text style={styles.categoryName}>{category.name}</Text>
              //     <Text style={styles.categoryPercentage}>
              //       {category.percentage}%
              //     </Text>
              //     <Text style={styles.categoryAmount}>
              //       ${getCategoryAmount(category.name, category.percentage)}
              //     </Text>
              //   </View>
              //   <View style={styles.actionButtons}>
              //     <TouchableOpacity
              //       onPress={() => handleWithdraw(index)}
              //       style={styles.withdrawButton}
              //     >
              //       <Text>💸</Text>
              //     </TouchableOpacity>
              //     <TouchableOpacity
              //       onPress={() => handleEditCategory(index)}
              //       style={styles.editButton}
              //     >
              //       <Text>✏️</Text>
              //     </TouchableOpacity>
              //     <TouchableOpacity
              //       onPress={() => handleDeleteCategory(index)}
              //       style={styles.deleteButton}
              //     >
              //       <Text>🗑️</Text>
              //     </TouchableOpacity>
              //   </View>
              // </View>
            ))
          )}

          {categories.length > 0 && (
            <View style={styles.totalPercentageContainer}>
              <Text
                style={[
                  styles.totalPercentage,
                  totalPercentage === 100
                    ? styles.validPercentage
                    : styles.invalidPercentage,
                ]}
              >
                Total: {totalPercentage}% {totalPercentage === 100 ? "✓" : ""}
              </Text>
            </View>
          )}
        </View>

        
          
      </ScrollView>

      {/* Add/Edit Category Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Edit Category" : "Add New Category"}
            </Text>

            <Text style={styles.modalLabel}>Category Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Groceries, Rent, Entertainment"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />

            <Text style={styles.modalLabel}>Percentage (%)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 25"
              keyboardType="numeric"
              value={newCategoryPercentage}
              onChangeText={setNewCategoryPercentage}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveCategory}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={withdrawModalVisible}
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Withdraw from{" "}
              {withdrawCategory !== null
                ? categories[withdrawCategory]?.name
                : ""}
            </Text>

            <Text style={styles.modalLabel}>Current Amount</Text>
            <Text style={styles.currentAmountText}>
              $
              {withdrawCategory !== null && categories[withdrawCategory]
                ? getCategoryAmount(
                    categories[withdrawCategory].name,
                    categories[withdrawCategory].percentage
                  )
                : "0.00"}
            </Text>

            <Text style={styles.modalLabel}>Withdraw Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setWithdrawModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={processWithdrawal}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Funds Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addFundsModalVisible}
        onRequestClose={() => setAddFundsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Funds to Budget</Text>

            <Text style={styles.modalLabel}>Current Budget</Text>
            <Text style={styles.currentAmountText}>
              ${totalAmount || "0.00"}
            </Text>

            <Text style={styles.modalLabel}>Amount to Add</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={addAmount}
                onChangeText={setAddAmount}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setAddFundsModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={processAddFunds}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>Add Funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    padding: 24,
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6b7280",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  addButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 50,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "500",
  },
  emptyContainer: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryInfoContainer: {
    flex: 1,
  },
  categoryName: {
    fontWeight: "500",
    color: "#1f2937",
    fontSize: 16,
  },
  categoryPercentage: {
    color: "#6b7280",
    marginTop: 2,
  },
  categoryAmount: {
    color: "#16a34a",
    fontWeight: "500",
    fontSize: 16,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
  },
  withdrawButton: {
    backgroundColor: "#dbeafe",
    padding: 8,
    borderRadius: 50,
    marginRight: 8,
  },
  editButton: {
    backgroundColor: "#e5e7eb",
    padding: 8,
    borderRadius: 50,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
    padding: 8,
    borderRadius: 50,
  },
  totalPercentageContainer: {
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  totalPercentage: {
    textAlign: "center",
    fontWeight: "500",
  },
  validPercentage: {
    color: "#16a34a",
  },
  invalidPercentage: {
    color: "#ef4444",
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currencySymbol: {
    fontSize: 16,
    color: "#6b7280",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    color: "#1f2937",
  },
  calculateButton: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  calculateButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "bold",
  },
  distributionItem: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  distributionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  distributionName: {
    fontWeight: "500",
    color: "#1f2937",
  },
  distributionPercentage: {
    color: "#6b7280",
  },
  distributionAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#16a34a",
  },
  totalContainer: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  totalAmount: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e40af",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    width: "85%",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  modalLabel: {
    color: "#6b7280",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelButton: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  cancelButtonText: {
    color: "#1f2937",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#ffffff",
  },
  budgetActions: {
    flexDirection: "row",
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "500",
  },
  currentAmountText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 16,
    textAlign: "center",
  },
});

export default App;
