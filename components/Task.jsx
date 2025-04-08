import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import "../global.css";

const API_URL = "https://fake-form.onrender.com/api/todo";

const Task = ({ task, fetch }) => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDueDate, setEditedDueDate] = useState(task.endDate.slice(0,10));
  const [isCompleted, setIsCompleted] = useState(task.completed);

  
  const handleCompleteTask = async () => {
    try {
      const userToken = await AsyncStorage.getItem("userToken");

      
      setIsCompleted(!isCompleted);

      await axios.patch(
        `${API_URL}/${task._id}`,
        {
          title: task.title,
          content: task.content || "No description available.",
          completed: !isCompleted,
          endDate: task.endDate,
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      Alert.alert("Success", `Task marked as ${!isCompleted ? "completed" : "incomplete"}!`);
      fetch();
    } catch (error) {
      console.error("Complete task error:", error);
      Alert.alert("Error", "Failed to complete task.");
      setIsCompleted(isCompleted); 
    }
  };

  
  const handleDeleteTask = async () => {
    try {
      const userToken = await AsyncStorage.getItem("userToken");
      await axios.delete(`${API_URL}/${task._id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      Alert.alert("Deleted", "Task has been removed.");
      fetch();
    } catch (error) {
      console.error("Delete task error:", error);
      Alert.alert("Error", "Failed to delete task.");
    }
  };

  
  const handleEditTask = async () => {
    try {
      const userToken = await AsyncStorage.getItem("userToken");

      await axios.patch(
        `${API_URL}/${task._id}`,
        {
          title: editedTitle,
          content: task.content || "No description available.",
          completed: isCompleted,
          endDate: editedDueDate,
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      Alert.alert("Updated", "Task updated successfully.");
      fetch();
      setIsEditModalVisible(false);
    } catch (error) {
      console.error("Edit task error:", error);
      Alert.alert("Error", "Failed to update task.");
    }
  };

  return (
    <>
      
      <LinearGradient
        colors={["#3b3b5f", "#25273D"]}
        className={`p-4 rounded-xl mb-4 shadow-lg ${
          isCompleted ? "opacity-50" : "opacity-100"
        }`}
      >
        <Text className="text-lg font-semibold text-white mb-1">
          {task.title}
        </Text>
        <Text className="text-gray-300">Due Date: {task.endDate.slice(0, 10)}</Text>
        
        
        <View className="flex-row justify-between mt-4">
          <TouchableOpacity
            onPress={handleCompleteTask}
            className={`p-3 rounded-lg shadow ${
              isCompleted ? "bg-gray-500" : "bg-green-500"
            }`}
          >
            <FontAwesome name="check" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsEditModalVisible(true)}
            className="bg-yellow-500 p-3 rounded-lg shadow"
          >
            <FontAwesome name="pencil" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteTask}
            className="bg-red-500 p-3 rounded-lg shadow"
          >
            <FontAwesome name="trash" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      
      <Modal transparent={true} visible={isEditModalVisible} animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-gray-900 w-4/5 p-5 rounded-xl shadow-lg">
            <Text className="text-xl font-bold text-white mb-3">Edit Task</Text>
            
            <TextInput
              className="border border-gray-600 p-3 rounded-lg mb-4 bg-gray-800 text-white"
              placeholder="Enter task title..."
              placeholderTextColor="#AAA"
              value={editedTitle}
              onChangeText={setEditedTitle}
            />
            
            <TextInput
              className="border border-gray-600 p-3 rounded-lg mb-4 bg-gray-800 text-white"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#AAA"
              value={editedDueDate}
              onChangeText={setEditedDueDate}
            />
            
            
            <View className="flex-row justify-between mt-4">
              <TouchableOpacity onPress={handleEditTask} className="bg-blue-500 px-4 py-2 rounded-lg">
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} className="bg-gray-500 px-4 py-2 rounded-lg">
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Task;
