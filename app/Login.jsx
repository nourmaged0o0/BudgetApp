import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import "../global.css";
import axios from "axios";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://fake-form.onrender.com/api/todo";

const Login = () => {
  const navigation = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); 

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });

      await AsyncStorage.setItem("userToken", response.data.token);

      setEmail("");
      setPassword("");
      setErrorMessage(""); 
      navigation.navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.message || "Invalid email or password.";
      setErrorMessage(errorMessage);
    }
  };

  const handlereg = () => {
    navigation.navigate("/Register");
  };

  return (
    <LinearGradient colors={["#1E1E2C", "#25273D"]} style={{ flex: 1 }}>
      <View className="flex-1 px-6 py-10 justify-center items-center">
        
        <Text className="text-4xl font-bold text-white mb-8">Welcome Back</Text>

        
        <TextInput
          className="border border-gray-500 p-4 w-4/5 rounded-lg bg-gray-800 text-white mb-4"
          placeholder="Email"
          placeholderTextColor="#AAA"
          keyboardType="email-address"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrorMessage(""); 
          }}
        />

        <TextInput
          className="border border-gray-500 p-4 w-4/5 rounded-lg bg-gray-800 text-white mb-6"
          placeholder="Password"
          placeholderTextColor="#AAA"
          secureTextEntry={true}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrorMessage(""); 
          }}
        />

        
        {errorMessage ? (
          <Text className="text-red-500 mb-4">{errorMessage}</Text>
        ) : null}

        
        <TouchableOpacity
          onPress={handleLogin}
          className="bg-blue-500 p-4 w-4/5 rounded-lg items-center mb-4"
        >
          <Text className="text-white font-bold text-lg">Login</Text>
        </TouchableOpacity>

        
        <TouchableOpacity onPress={handlereg}>
          <Text className="text-blue-400">Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default Login;
